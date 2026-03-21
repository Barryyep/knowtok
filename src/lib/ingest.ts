import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchArxivPapers, type ArxivPaper } from "@/lib/arxiv";
import { generatePaperMetadata, buildFallbackMetadata } from "@/lib/llm";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { DomainKey, IngestRunResult } from "@/types/domain";

export type IngestMode = "daily" | "backfill";
const DOMAINS: DomainKey[] = ["cs", "physics", "math", "q-bio", "q-fin", "econ", "astro-ph"];
const DAILY_LIMIT_PER_DOMAIN = 30;
const BACKFILL_FETCH_PER_DOMAIN = 250;
const MAX_LLM_ERROR_LOGS_PER_DOMAIN = 5;
const ARXIV_MIN_INTERVAL_MS = 3500;
const ARXIV_RETRY_BASE_MS = 5000;
const ARXIV_FETCH_RETRIES = 4;

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetries<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await wait(300 * attempt);
      }
    }
  }

  throw lastError;
}

function logInfo(enabled: boolean | undefined, message: string) {
  if (!enabled) return;
  console.log(`[ingest] ${message}`);
}

function isArxiv429(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /status 429/i.test(message);
}

async function upsertPaperByVersion(client: SupabaseClient, paper: ArxivPaper & {
  hookSummaryEn: string;
  tags: string[];
  plainSummaryEn: string;
  humanCategory: string;
}) {
  const { data: existing, error: existingError } = await client
    .from("papers")
    .select("id, arxiv_id_version")
    .eq("arxiv_id_base", paper.arxivIdBase)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const payload = {
    source: "arxiv",
    arxiv_id_base: paper.arxivIdBase,
    arxiv_id_version: paper.arxivIdVersion,
    title: paper.title,
    abstract: paper.abstract,
    hook_summary_en: paper.hookSummaryEn,
    tags: paper.tags,
    authors: paper.authors,
    primary_category: paper.primaryCategory,
    categories: paper.categories,
    published_at: paper.publishedAt,
    source_updated_at: paper.sourceUpdatedAt,
    pdf_url: paper.pdfUrl,
    abs_url: paper.absUrl,
    metadata: paper.metadata,
    plain_summary_en: paper.plainSummaryEn,
    human_category: paper.humanCategory,
  };

  if (!existing) {
    const { error } = await client.from("papers").insert(payload);
    if (error) {
      throw error;
    }
    return true;
  }

  if (paper.arxivIdVersion <= Number(existing.arxiv_id_version)) {
    return false;
  }

  const { error } = await client.from("papers").update(payload).eq("id", existing.id);
  if (error) {
    throw error;
  }

  return true;
}

async function startRunRecord(client: SupabaseClient, options: {
  mode: IngestMode;
  days: number;
  triggeredBy: "cli" | "cron";
}) {
  const startIso = new Date().toISOString();
  const { data, error } = await client
    .from("ingest_runs")
    .insert({
      triggered_by: options.triggeredBy,
      run_mode: options.mode,
      backfill_days: options.mode === "backfill" ? options.days : null,
      status: "running",
      fetched_count: 0,
      upserted_count: 0,
      llm_failed_count: 0,
      skipped_count: 0,
      started_at: startIso,
      log: {
        domainStats: {},
      },
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(`Failed to create ingest run: ${error?.message || "unknown"}`);
  }

  return {
    runId: data.id as string,
    startedAt: startIso,
  };
}

function getStatus(input: {
  fetchedCount: number;
  upsertedCount: number;
  llmFailedCount: number;
  skippedCount: number;
  fetchFailedDomains: number;
}): IngestRunResult["status"] {
  if (input.fetchedCount === 0) {
    return "failed";
  }

  if (input.upsertedCount === 0) {
    return "partial";
  }

  if (input.llmFailedCount > 0 || input.skippedCount > 0 || input.fetchFailedDomains > 0) {
    return "partial";
  }

  return "success";
}

export async function runIngestPipeline(options: {
  mode: IngestMode;
  days?: number;
  triggeredBy: "cli" | "cron";
  verbose?: boolean;
}): Promise<IngestRunResult> {
  const serviceClient = createServiceRoleClient();
  const days = options.mode === "backfill" ? Math.max(options.days ?? 14, 1) : 1;
  logInfo(options.verbose, `run started mode=${options.mode} days=${days} triggeredBy=${options.triggeredBy}`);

  const { runId, startedAt } = await startRunRecord(serviceClient, {
    mode: options.mode,
    days,
    triggeredBy: options.triggeredBy,
  });

  let fetchedCount = 0;
  let upsertedCount = 0;
  let unchangedCount = 0;
  let llmFailedCount = 0;
  let skippedCount = 0;
  let fetchFailedDomains = 0;
  const log: {
    domainStats: Record<string, Record<string, number>>;
    errors: string[];
  } = {
    domainStats: {},
    errors: [],
  };
  let lastArxivFetchAt = 0;

  try {
    for (const domain of DOMAINS) {
      logInfo(options.verbose, `domain=${domain} fetching papers...`);
      const domainSince = options.mode === "backfill" ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined;
      let papers: ArxivPaper[] = [];
      try {
        let lastFetchError: unknown = null;
        for (let attempt = 1; attempt <= ARXIV_FETCH_RETRIES; attempt += 1) {
          const elapsed = Date.now() - lastArxivFetchAt;
          if (elapsed < ARXIV_MIN_INTERVAL_MS) {
            const waitMs = ARXIV_MIN_INTERVAL_MS - elapsed;
            logInfo(options.verbose, `domain=${domain} waiting ${waitMs}ms to respect arXiv rate limit`);
            await wait(waitMs);
          }

          lastArxivFetchAt = Date.now();

          try {
            papers = await fetchArxivPapers({
              domain,
              maxResults: options.mode === "daily" ? DAILY_LIMIT_PER_DOMAIN : BACKFILL_FETCH_PER_DOMAIN,
              since: domainSince,
            });
            break;
          } catch (error) {
            lastFetchError = error;
            if (attempt < ARXIV_FETCH_RETRIES) {
              const backoffMs = isArxiv429(error) ? ARXIV_RETRY_BASE_MS * attempt : 1200 * attempt;
              logInfo(
                options.verbose,
                `domain=${domain} fetch attempt ${attempt}/${ARXIV_FETCH_RETRIES} failed: ${(error as Error).message}. retry in ${backoffMs}ms`,
              );
              await wait(backoffMs);
            }
          }
        }

        if (papers.length === 0 && lastFetchError) {
          throw lastFetchError;
        }
      } catch (error) {
        fetchFailedDomains += 1;
        log.errors.push(`Domain ${domain} fetch failed: ${(error as Error).message}`);
        logInfo(options.verbose, `domain=${domain} fetch failed: ${(error as Error).message}`);
        log.domainStats[domain] = {
          fetched: 0,
          upserted: 0,
          unchanged: 0,
          skipped: 0,
          llmFailed: 0,
        };
        continue;
      }

      const capped = options.mode === "daily" ? papers.slice(0, DAILY_LIMIT_PER_DOMAIN) : papers;
      fetchedCount += capped.length;

      let domainUpserted = 0;
      let domainUnchanged = 0;
      let domainSkipped = 0;
      let domainLlmFailed = 0;
      let domainLlmErrorLogged = 0;
      logInfo(options.verbose, `domain=${domain} fetched=${capped.length}`);

      for (const paper of capped) {
        try {
          let hookSummaryEn = "";
          let tags: string[] = [];
          let plainSummaryEn = "";
          let humanCategory = "AI & Robots";
          try {
            const metadata = await withRetries(
              () =>
                generatePaperMetadata({
                  title: paper.title,
                  abstract: paper.abstract,
                  categories: paper.categories,
                }),
              3,
            );
            hookSummaryEn = metadata.hook;
            tags = metadata.tags;
            plainSummaryEn = metadata.plainSummary;
            humanCategory = metadata.humanCategory;
          } catch (llmError) {
            llmFailedCount += 1;
            domainLlmFailed += 1;
            if (domainLlmErrorLogged < MAX_LLM_ERROR_LOGS_PER_DOMAIN) {
              log.errors.push(
                `Domain ${domain}, paper ${paper.arxivIdBase} llm failed: ${(llmError as Error).message}`,
              );
              domainLlmErrorLogged += 1;
            }
            const fallback = buildFallbackMetadata({
              title: paper.title,
              abstract: paper.abstract,
              categories: paper.categories,
              primaryCategory: paper.primaryCategory,
            });
            hookSummaryEn = fallback.hook;
            tags = fallback.tags;
            plainSummaryEn = fallback.plainSummary;
            humanCategory = fallback.humanCategory;
          }

          const didUpsert = await upsertPaperByVersion(serviceClient, {
            ...paper,
            hookSummaryEn,
            tags,
            plainSummaryEn,
            humanCategory,
          });

          if (didUpsert) {
            upsertedCount += 1;
            domainUpserted += 1;
          } else {
            unchangedCount += 1;
            domainUnchanged += 1;
          }
        } catch (error) {
          skippedCount += 1;
          domainSkipped += 1;
          log.errors.push(`Domain ${domain}, paper ${paper.arxivIdBase}: ${(error as Error).message}`);
        }
      }

      log.domainStats[domain] = {
        fetched: capped.length,
        upserted: domainUpserted,
        unchanged: domainUnchanged,
        skipped: domainSkipped,
        llmFailed: domainLlmFailed,
      };
      logInfo(
        options.verbose,
        `domain=${domain} done fetched=${capped.length} upserted=${domainUpserted} unchanged=${domainUnchanged} llmFailed=${domainLlmFailed} skipped=${domainSkipped}`,
      );
    }

    // TTL cleanup for personalized hooks older than 7 days
    await serviceClient
      .from("personalized_hooks")
      .delete()
      .lt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const endedAt = new Date().toISOString();
    const status = getStatus({
      fetchedCount,
      upsertedCount,
      llmFailedCount,
      skippedCount,
      fetchFailedDomains,
    });

    const { error: updateError } = await serviceClient
      .from("ingest_runs")
      .update({
        status,
        fetched_count: fetchedCount,
        upserted_count: upsertedCount,
        llm_failed_count: llmFailedCount,
        skipped_count: skippedCount,
        ended_at: endedAt,
        log,
      })
      .eq("id", runId);

    if (updateError) {
      throw updateError;
    }

    logInfo(
      options.verbose,
      `run completed status=${status} fetched=${fetchedCount} upserted=${upsertedCount} unchanged=${unchangedCount} llmFailed=${llmFailedCount} skipped=${skippedCount} fetchFailedDomains=${fetchFailedDomains}`,
    );

    return {
      runId,
      status,
      fetchedCount,
      upsertedCount,
      unchangedCount,
      llmFailedCount,
      skippedCount,
      fetchFailedDomains,
      startedAt,
      endedAt,
      message: `Ingest ${status}: fetched=${fetchedCount}, upserted=${upsertedCount}, unchanged=${unchangedCount}, llmFailed=${llmFailedCount}, skipped=${skippedCount}, fetchFailedDomains=${fetchFailedDomains}`,
    };
  } catch (error) {
    const endedAt = new Date().toISOString();
    await serviceClient
      .from("ingest_runs")
      .update({
        status: "failed",
        fetched_count: fetchedCount,
        upserted_count: upsertedCount,
        llm_failed_count: llmFailedCount,
        skipped_count: skippedCount,
        ended_at: endedAt,
        log: {
          ...log,
          fatal: (error as Error).message,
        },
      })
      .eq("id", runId);

    return {
      runId,
      status: "failed",
      fetchedCount,
      upsertedCount,
      unchangedCount,
      llmFailedCount,
      skippedCount,
      fetchFailedDomains,
      startedAt,
      endedAt,
      message: `Ingest failed: ${(error as Error).message}`,
    };
  }
}
