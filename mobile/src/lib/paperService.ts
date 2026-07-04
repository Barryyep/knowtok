import { categoryEmoji, categoryLabel } from "./categories";
import { hashStringToNumber } from "./jsonUtils";
import { supabase } from "./supabase";
import type { AppLanguage, DailyFact, PaperRow } from "./types";

/**
 * Widened row: `source` + `metadata` are selected so the citation label can
 * be source-aware (arXiv vs OpenAlex venue). PaperRow (a frozen contract in
 * types.ts) stays as-is; this superset carries the extra fields at runtime.
 */
export type CandidatePaper = PaperRow & {
  source: string | null;
  metadata: { venue?: string | null } | null;
};

const PAPER_FIELDS =
  "id, source, arxiv_id_base, title, hook_summary_en, hook_summary_zh, plain_summary_en, plain_summary_zh, human_category, published_at, abs_url, metadata";

/**
 * Recent papers that have content in the user's language, optionally scoped
 * to the persona's human_category values. Small pool — the daily pick
 * rotates within it.
 */
export async function fetchCandidatePapers(
  language: AppLanguage,
  categories: string[] = [],
): Promise<CandidatePaper[]> {
  let query = supabase
    .from("papers")
    .select(PAPER_FIELDS)
    .order("published_at", { ascending: false })
    .limit(60);
  if (language === "zh") {
    query = query.not("hook_summary_zh", "is", null);
  }
  if (categories.length > 0) {
    query = query.in("human_category", categories);
  }
  const { data, error } = await query;
  if (error) throw new Error(`papers query failed: ${error.message}`);
  return (data ?? []) as unknown as CandidatePaper[];
}

/**
 * Pick today's paper: stable for (user, date) so reopening the app shows
 * the same fact, excluding papers already shown recently ("换一条" adds
 * the current one to the exclusion list).
 */
export function pickDailyPaper(
  papers: CandidatePaper[],
  userId: string,
  dateStr: string,
  excludeIds: string[],
): CandidatePaper | null {
  const pool = papers.filter((p) => !excludeIds.includes(p.id));
  const candidates = pool.length > 0 ? pool : papers;
  if (candidates.length === 0) return null;
  return candidates[hashStringToNumber(`${userId}:${dateStr}`) % candidates.length];
}

/** Source-aware citation line: arXiv id for arXiv, journal/venue for OpenAlex. */
function buildSourceLabel(paper: CandidatePaper, publishedDate: string): string {
  const source = (paper.source || "arxiv").toLowerCase();
  if (source === "openalex") {
    const venue = paper.metadata?.venue?.trim() || "OpenAlex";
    return `${venue} · ${publishedDate}`;
  }
  return `arXiv:${paper.arxiv_id_base} · ${publishedDate}`;
}

export function paperToFact(paper: CandidatePaper, language: AppLanguage, dateStr: string): DailyFact {
  const hook = language === "zh" ? paper.hook_summary_zh : paper.hook_summary_en;
  const summary = language === "zh" ? paper.plain_summary_zh : paper.plain_summary_en;
  const publishedDate = (paper.published_at ?? "").slice(0, 10);
  // Only arXiv rows carry a real arXiv id; OpenAlex reuses arxiv_id_base as a
  // W-id, so it must NOT be surfaced with an "arXiv:" label.
  const isArxiv = paper.source == null || paper.source.toLowerCase() === "arxiv";
  return {
    date: dateStr,
    emoji: categoryEmoji(paper.human_category),
    topic: categoryLabel(paper.human_category, language),
    fact: hook?.trim() || summary?.trim() || paper.title,
    whyCare: "",
    source: {
      kind: "paper",
      factId: paper.id,
      paperId: paper.id,
      ...(isArxiv ? { arxivId: paper.arxiv_id_base } : {}),
      title: paper.title,
      url: paper.abs_url,
      publishedAt: paper.published_at,
      label: buildSourceLabel(paper, publishedDate),
    },
  };
}
