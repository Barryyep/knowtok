import { NextResponse } from "next/server";
import { DOMAIN_OPTIONS } from "@/lib/constants";
import { decodeCursor, encodeCursor, mixFeedItems } from "@/lib/feed-mix";
import { jsonError } from "@/lib/http";
import { getAuthedClient } from "@/lib/supabase/server";
import type { DomainKey, PaperCard } from "@/types/domain";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;

function mapPaperCard(row: Record<string, unknown>, saved = false): PaperCard {
  return {
    id: String(row.id),
    arxivIdBase: String(row.arxiv_id_base),
    arxivIdVersion: Number(row.arxiv_id_version ?? 1),
    title: String(row.title ?? "Untitled"),
    hookSummaryEn: String(row.hook_summary_en ?? ""),
    tags: (row.tags as string[] | null) ?? [],
    primaryCategory: String(row.primary_category ?? ""),
    categories: (row.categories as string[] | null) ?? [],
    publishedAt: String(row.published_at ?? new Date(0).toISOString()),
    absUrl: String(row.abs_url ?? ""),
    pdfUrl: (row.pdf_url as string | null) ?? null,
    saved,
  };
}

function parseDomain(rawDomain: string | null): DomainKey | null {
  if (!rawDomain) return null;
  const normalized = rawDomain.toLowerCase();
  const found = DOMAIN_OPTIONS.find((option) => option.key === normalized);
  return found?.key ?? null;
}

export async function GET(request: Request) {
  try {
    const { client, user } = await getAuthedClient(request);
    const { searchParams } = new URL(request.url);

    const domain = parseDomain(searchParams.get("domain"));
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || DEFAULT_LIMIT), 1), MAX_LIMIT);
    const cursor = decodeCursor(searchParams.get("cursor"));

    const skipSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: skipEvents, error: skipError } = await client
      .from("user_events")
      .select("paper_id")
      .eq("user_id", user.id)
      .eq("event_type", "skip")
      .gte("created_at", skipSince);

    if (skipError) {
      throw skipError;
    }

    const skipIds = new Set(
      ((skipEvents as Array<{ paper_id: string | null }> | null) ?? [])
        .map((event) => event.paper_id)
        .filter((paperId): paperId is string => Boolean(paperId)),
    );

    const fetchSize = Math.max(limit * 4, 60);

    let latestQuery = client
      .from("papers")
      .select("id, arxiv_id_base, arxiv_id_version, title, hook_summary_en, tags, primary_category, categories, published_at, abs_url, pdf_url")
      .order("published_at", { ascending: false })
      .range(cursor.offset, cursor.offset + fetchSize - 1);

    let randomQuery = client
      .from("papers")
      .select("id, arxiv_id_base, arxiv_id_version, title, hook_summary_en, tags, primary_category, categories, published_at, abs_url, pdf_url")
      .order("published_at", { ascending: false })
      .limit(500);

    if (domain) {
      latestQuery = latestQuery.like("primary_category", `${domain}.%`);
      randomQuery = randomQuery.like("primary_category", `${domain}.%`);
    }

    const [latestResult, randomResult] = await Promise.all([latestQuery, randomQuery]);

    if (latestResult.error) {
      throw latestResult.error;
    }
    if (randomResult.error) {
      throw randomResult.error;
    }

    const latestRows = ((latestResult.data as Array<Record<string, unknown>> | null) ?? []).filter(
      (row) => !skipIds.has(String(row.id)),
    );
    const randomRows = ((randomResult.data as Array<Record<string, unknown>> | null) ?? []).filter(
      (row) => !skipIds.has(String(row.id)),
    );

    const mixedRaw = mixFeedItems({
      latest: latestRows.map((row) => mapPaperCard(row)),
      randomPool: randomRows.map((row) => mapPaperCard(row)),
      limit,
      latestRatio: 0.7,
    });

    const paperIds = mixedRaw.map((paper) => paper.id);
    const { data: savedRows, error: savedError } = await client
      .from("user_saved_papers")
      .select("paper_id")
      .eq("user_id", user.id)
      .in("paper_id", paperIds.length > 0 ? paperIds : ["00000000-0000-0000-0000-000000000000"]);

    if (savedError) {
      throw savedError;
    }

    const savedIdSet = new Set(
      ((savedRows as Array<{ paper_id: string }> | null) ?? []).map((row) => row.paper_id),
    );

    const items = mixedRaw.map((paper) => ({
      ...paper,
      saved: savedIdSet.has(paper.id),
    }));

    if (items.length > 0) {
      await client.from("user_events").insert(
        items.map((paper) => ({
          user_id: user.id,
          paper_id: paper.id,
          event_type: "view",
          metadata: {
            source: "feed_api",
          },
        })),
      );
    }

    const nextCursor =
      items.length > 0
        ? encodeCursor({
            offset: cursor.offset + Math.ceil(limit * 0.7),
          })
        : null;

    return NextResponse.json({ items, nextCursor });
  } catch (error) {
    return jsonError(error, "Failed to load feed");
  }
}
