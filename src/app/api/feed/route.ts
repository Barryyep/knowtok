import { after, NextResponse } from "next/server";
import { CATEGORY_OPTIONS } from "@/lib/constants";
import { decodeCursor, encodeCursor, mixFeedItems } from "@/lib/feed-mix";
import { jsonError } from "@/lib/http";
import { generatePersonalizedHook } from "@/lib/llm";
import { getAuthedClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { HumanCategory, PaperCard } from "@/types/domain";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;

const SELECT_FIELDS =
  "id, arxiv_id_base, arxiv_id_version, title, hook_summary_en, plain_summary_en, human_category, tags, primary_category, categories, published_at, abs_url, pdf_url";

function mapPaperCard(
  row: Record<string, unknown>,
  saved = false,
  personalizedHook?: string,
): PaperCard {
  const globalHook = String(row.hook_summary_en ?? "");
  return {
    id: String(row.id),
    arxivIdBase: String(row.arxiv_id_base),
    arxivIdVersion: Number(row.arxiv_id_version ?? 1),
    title: String(row.title ?? "Untitled"),
    hookSummaryEn: globalHook,
    personalizedHook: personalizedHook || globalHook,
    plainSummary: String(row.plain_summary_en ?? row.abstract ?? ""),
    humanCategory: String(row.human_category ?? "AI & Robots"),
    tags: (row.tags as string[] | null) ?? [],
    primaryCategory: String(row.primary_category ?? ""),
    categories: (row.categories as string[] | null) ?? [],
    publishedAt: String(row.published_at ?? new Date(0).toISOString()),
    absUrl: String(row.abs_url ?? ""),
    pdfUrl: (row.pdf_url as string | null) ?? null,
    saved,
  };
}

function parseCategory(raw: string | null): HumanCategory | null {
  if (!raw) return null;
  const normalized = raw.toLowerCase().replace(/[\s&]+/g, "-");
  const found = CATEGORY_OPTIONS.find(
    (opt) => opt.key.toLowerCase().replace(/[\s&]+/g, "-") === normalized,
  );
  return (found?.key as HumanCategory) ?? null;
}

export async function GET(request: Request) {
  try {
    const { client, user } = await getAuthedClient(request);
    const { searchParams } = new URL(request.url);

    const category = parseCategory(searchParams.get("category"));
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") || DEFAULT_LIMIT), 1),
      MAX_LIMIT,
    );
    const cursor = decodeCursor(searchParams.get("cursor"));
    const isFirstLoad = searchParams.get("firstLoad") === "true";

    // Get user's job title for personalized hooks
    const { data: persona } = await client
      .from("user_personas")
      .select("job_title, location")
      .eq("user_id", user.id)
      .maybeSingle();

    const jobTitle = (persona?.job_title as string | null) ?? null;
    const jobTitleNormalized = jobTitle?.toLowerCase().trim() || null;
    const userLocation = (persona?.location as string | null) ?? null;

    // Skip events
    const skipSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: skipEvents, error: skipError } = await client
      .from("user_events")
      .select("paper_id")
      .eq("user_id", user.id)
      .eq("event_type", "skip")
      .gte("created_at", skipSince);

    if (skipError) throw skipError;

    const skipIds = new Set(
      ((skipEvents as Array<{ paper_id: string | null }> | null) ?? [])
        .map((e) => e.paper_id)
        .filter((id): id is string => Boolean(id)),
    );

    const fetchSize = Math.max(limit * 4, 60);

    let latestQuery = client
      .from("papers")
      .select(SELECT_FIELDS)
      .order("published_at", { ascending: false })
      .range(cursor.offset, cursor.offset + fetchSize - 1);

    let randomQuery = client
      .from("papers")
      .select(SELECT_FIELDS)
      .order("published_at", { ascending: false })
      .limit(500);

    if (category) {
      latestQuery = latestQuery.eq("human_category", category);
      randomQuery = randomQuery.eq("human_category", category);
    }

    const [latestResult, randomResult] = await Promise.all([latestQuery, randomQuery]);

    if (latestResult.error) throw latestResult.error;
    if (randomResult.error) throw randomResult.error;

    const latestRows = (
      (latestResult.data as Array<Record<string, unknown>> | null) ?? []
    ).filter((row) => !skipIds.has(String(row.id)));
    const randomRows = (
      (randomResult.data as Array<Record<string, unknown>> | null) ?? []
    ).filter((row) => !skipIds.has(String(row.id)));

    // Lookup cached personalized hooks
    const allPaperIds = [
      ...new Set([
        ...latestRows.map((r) => String(r.id)),
        ...randomRows.map((r) => String(r.id)),
      ]),
    ];

    let hookMap = new Map<string, string>();
    if (jobTitleNormalized && allPaperIds.length > 0) {
      const { data: cachedHooks } = await client
        .from("personalized_hooks")
        .select("paper_id, hook_text")
        .eq("job_title_normalized", jobTitleNormalized)
        .in("paper_id", allPaperIds);

      if (cachedHooks) {
        hookMap = new Map(
          (cachedHooks as Array<{ paper_id: string; hook_text: string }>).map(
            (h) => [h.paper_id, h.hook_text],
          ),
        );
      }
    }

    const mixedRaw = mixFeedItems({
      latest: latestRows.map((row) =>
        mapPaperCard(row, false, hookMap.get(String(row.id))),
      ),
      randomPool: randomRows.map((row) =>
        mapPaperCard(row, false, hookMap.get(String(row.id))),
      ),
      limit,
      latestRatio: 0.7,
    });

    // Saved status
    const paperIds = mixedRaw.map((p) => p.id);
    const { data: savedRows, error: savedError } = await client
      .from("user_saved_papers")
      .select("paper_id")
      .eq("user_id", user.id)
      .in(
        "paper_id",
        paperIds.length > 0
          ? paperIds
          : ["00000000-0000-0000-0000-000000000000"],
      );

    if (savedError) throw savedError;

    const savedIdSet = new Set(
      ((savedRows as Array<{ paper_id: string }> | null) ?? []).map(
        (r) => r.paper_id,
      ),
    );

    let items = mixedRaw.map((paper) => ({
      ...paper,
      saved: savedIdSet.has(paper.id),
    }));

    // First-load sync personalization: generate hooks synchronously
    if (isFirstLoad && jobTitleNormalized) {
      const uncached = items.filter(
        (p) => p.personalizedHook === p.hookSummaryEn,
      );
      if (uncached.length > 0) {
        const serviceClient = createServiceRoleClient();
        const hookResults = await Promise.allSettled(
          uncached.slice(0, 6).map(async (paper) => {
            const result = await generatePersonalizedHook({
              globalHook: paper.hookSummaryEn,
              plainSummary: paper.plainSummary,
              jobTitle: jobTitle!,
              location: userLocation,
            });
            // Cache it
            await serviceClient
              .from("personalized_hooks")
              .upsert(
                {
                  paper_id: paper.id,
                  job_title_normalized: jobTitleNormalized,
                  hook_text: result.text,
                },
                { onConflict: "paper_id,job_title_normalized" },
              );
            return { paperId: paper.id, hook: result.text };
          }),
        );

        const successfulHooks = new Map<string, string>();
        for (const r of hookResults) {
          if (r.status === "fulfilled") {
            successfulHooks.set(r.value.paperId, r.value.hook);
          }
        }

        items = items.map((p) => ({
          ...p,
          personalizedHook: successfulHooks.get(p.id) || p.personalizedHook,
        }));
      }
    }

    // Track views
    if (items.length > 0) {
      await client.from("user_events").insert(
        items.map((paper) => ({
          user_id: user.id,
          paper_id: paper.id,
          event_type: "view",
          metadata: { source: "feed_api" },
        })),
      );
    }

    const nextCursor =
      items.length > 0
        ? encodeCursor({ offset: cursor.offset + Math.ceil(limit * 0.7) })
        : null;

    // Async: generate personalized hooks for cache misses (non-first-load)
    if (!isFirstLoad && jobTitleNormalized) {
      const uncachedIds = items
        .filter((p) => p.personalizedHook === p.hookSummaryEn)
        .map((p) => ({
          id: p.id,
          globalHook: p.hookSummaryEn,
          plainSummary: p.plainSummary,
        }));

      if (uncachedIds.length > 0) {
        after(async () => {
          const serviceClient = createServiceRoleClient();
          for (const paper of uncachedIds) {
            try {
              const result = await generatePersonalizedHook({
                globalHook: paper.globalHook,
                plainSummary: paper.plainSummary,
                jobTitle: jobTitle!,
                location: userLocation,
              });
              await serviceClient
                .from("personalized_hooks")
                .upsert(
                  {
                    paper_id: paper.id,
                    job_title_normalized: jobTitleNormalized,
                    hook_text: result.text,
                  },
                  { onConflict: "paper_id,job_title_normalized" },
                );
            } catch (err) {
              console.error(
                `[feed] Failed to generate personalized hook for paper=${paper.id} job=${jobTitleNormalized}:`,
                err,
              );
            }
          }
        });
      }
    }

    return NextResponse.json({ items, nextCursor });
  } catch (error) {
    return jsonError(error, "Failed to load feed");
  }
}
