import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchArxivPapers, type ArxivPaper } from "@/lib/arxiv";
import { generatePaperHookAndTags } from "@/lib/llm";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { DomainKey, IngestRunResult } from "@/types/domain";

export type IngestMode = "daily" | "backfill";

const DOMAINS: DomainKey[] = ["cs", "physics", "math"];
const DAILY_LIMIT_PER_DOMAIN = 30;
const BACKFILL_FETCH_PER_DOMAIN = 250;

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

async function upsertPaperByVersion(client: SupabaseClient, paper: ArxivPaper & { hookSummaryEn: string; tags: string[] }) {
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

function getStatus(upsertedCount: number, llmFailedCount: number): IngestRunResult["status"] {
  if (upsertedCount === 0) {
    return "failed";
  }
  if (llmFailedCount > 0) {
    return "partial";
  }
  return "success";
}

export async function runIngestPipeline(options: {
  mode: IngestMode;
  days?: number;
  triggeredBy: "cli" | "cron";
}): Promise<IngestRunResult> {
  const serviceClient = createServiceRoleClient();
  const days = options.mode === "backfill" ? Math.max(options.days ?? 14, 1) : 1;
  const { runId, startedAt } = await startRunRecord(serviceClient, {
    mode: options.mode,
    days,
    triggeredBy: options.triggeredBy,
  });

  let fetchedCount = 0;
  let upsertedCount = 0;
  let llmFailedCount = 0;
  let skippedCount = 0;
  const log: {
    domainStats: Record<string, Record<string, number>>;
    errors: string[];
  } = {
    domainStats: {},
    errors: [],
  };

  try {
    for (const domain of DOMAINS) {
      const domainSince = options.mode === "backfill" ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined;
      const papers = await fetchArxivPapers({
        domain,
        maxResults: options.mode === "daily" ? DAILY_LIMIT_PER_DOMAIN : BACKFILL_FETCH_PER_DOMAIN,
        since: domainSince,
      });

      const capped = options.mode === "daily" ? papers.slice(0, DAILY_LIMIT_PER_DOMAIN) : papers;
      fetchedCount += capped.length;

      let domainUpserted = 0;
      let domainSkipped = 0;
      let domainLlmFailed = 0;

      for (const paper of capped) {
        try {
          const llmResult = await withRetries(
            () =>
              generatePaperHookAndTags({
                title: paper.title,
                abstract: paper.abstract,
                categories: paper.categories,
              }),
            3,
          );

          const didUpsert = await upsertPaperByVersion(serviceClient, {
            ...paper,
            hookSummaryEn: llmResult.hook,
            tags: llmResult.tags,
          });

          if (didUpsert) {
            upsertedCount += 1;
            domainUpserted += 1;
          }
        } catch (error) {
          llmFailedCount += 1;
          skippedCount += 1;
          domainLlmFailed += 1;
          domainSkipped += 1;
          log.errors.push(`Domain ${domain}, paper ${paper.arxivIdBase}: ${(error as Error).message}`);
        }
      }

      log.domainStats[domain] = {
        fetched: capped.length,
        upserted: domainUpserted,
        skipped: domainSkipped,
        llmFailed: domainLlmFailed,
      };
    }

    const endedAt = new Date().toISOString();
    const status = getStatus(upsertedCount, llmFailedCount);

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

    return {
      runId,
      status,
      fetchedCount,
      upsertedCount,
      llmFailedCount,
      skippedCount,
      startedAt,
      endedAt,
      message: `Ingest ${status}: fetched=${fetchedCount}, upserted=${upsertedCount}, skipped=${skippedCount}`,
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
      llmFailedCount,
      skippedCount,
      startedAt,
      endedAt,
      message: `Ingest failed: ${(error as Error).message}`,
    };
  }
}
