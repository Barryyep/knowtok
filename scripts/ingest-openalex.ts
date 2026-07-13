/**
 * OpenAlex ingest — CLIMATE ONLY.
 *
 * The empirical source evaluation (docs/data-sources-v2.md) found OpenAlex is
 * only salvageable for Climate: the topic taxonomy has no consumer home for
 * Money or Food, and Health tops out around ~35–40% layperson-usable. So this
 * ingest is now scoped to Climate using the validated "Finding-E" recipe:
 *   - topic-id allowlist (T11244|T10471|T10895 climate topics), NOT field ids
 *   - type:article, is_paratext:false, language:en, recent window
 *   - client-side post-filter: primary_topic.score >= 0.5 (OpenAlex cannot
 *     filter on score server-side) + a corrigendum/erratum/etc title blocklist
 *
 * Pipeline mirrors the arXiv one:
 *   OpenAlex works API (JSON) → reconstruct abstract from the inverted index
 *   → generatePaperMetadata (same OpenAI generator, banned-openers rule)
 *   → upsert into `papers` with source='openalex', human_category='Climate'.
 *
 * Usage:
 *   npx tsx scripts/ingest-openalex.ts               # default target
 *   npx tsx scripts/ingest-openalex.ts --target 30   # override target
 */

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: true, quiet: true });
loadDotenv({ path: ".env", override: false, quiet: true });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { generatePaperMetadata } from "../src/lib/llm";
import { generateRelevance, scoreStructure } from "../src/lib/relevance";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL_STR = process.env.OPENAI_MODEL_LOW_COST || "gpt-4o-mini";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });

// Polite-pool contact (OpenAlex asks for a mailto so they can reach you).
const MAILTO = "hello@ohlo.app";
const OPENALEX_WORKS = "https://api.openalex.org/works";

/**
 * CLIMATE-ONLY topic allowlist (the validated Finding-E recipe). These are
 * OpenAlex TOPIC ids (T-level), not field ids — topic-level filtering is far
 * more precise than the old field-level filter and is what kept the Climate
 * sample at ~60–70% usable in docs/data-sources-v2.md:
 *   T11244  Climate Change and Health
 *   T10471  Climate Change, Policy & Economics
 *   T10895  Climate variability / related climate topic
 */
const CLIMATE_TOPIC_IDS = ["T11244", "T10471", "T10895"];
const CLIMATE_LABEL = "Environmental Science";
const CLIMATE_HUMAN_CATEGORY = "Climate";

/** Minimum primary_topic.score to keep a work (kills off-topic leaks). */
const MIN_TOPIC_SCORE = 0.5;

/** Paratext that leaks through despite is_paratext:false — drop by title. */
const PARATEXT_TITLE = /corrigendum|erratum|retraction|editorial/i;

/** Recency window for the Climate query (days). */
const CLIMATE_WINDOW_DAYS = 730;

/** Citation floor — Climate has enough cited work to afford quality filtering. */
const CLIMATE_MIN_CITATIONS = 20;

const TARGET = (() => {
  const idx = process.argv.indexOf("--target");
  if (idx >= 0) {
    const v = Number.parseInt(process.argv[idx + 1] || "", 10);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return 25;
})();

// How many OA works to pull before filtering/LLM. Climate is cited-sorted (the
// Finding-E recipe optimizes for quality over raw freshness), so we pull a
// healthy page and keep the first TARGET that survive the score/paratext
// post-filters and reconstruct into a usable abstract.
const FETCH_COUNT = 50;

type OpenAlexWork = {
  id: string;
  doi: string | null;
  title: string | null;
  display_name: string | null;
  publication_date: string | null;
  updated_date: string | null;
  cited_by_count: number;
  language: string | null;
  abstract_inverted_index: Record<string, number[]> | null;
  primary_location: {
    landing_page_url: string | null;
    source: { display_name: string | null } | null;
  } | null;
  primary_topic: {
    id: string | null;
    display_name: string | null;
    score: number | null;
    field: { display_name: string | null } | null;
  } | null;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** OpenAlex ships abstracts as a position→word inverted index; rebuild it. */
function reconstructAbstract(inv: Record<string, number[]> | null): string {
  if (!inv) return "";
  const slots: Array<[number, string]> = [];
  for (const [word, positions] of Object.entries(inv)) {
    for (const p of positions) slots.push([p, word]);
  }
  slots.sort((a, b) => a[0] - b[0]);
  return slots.map(([, w]) => w).join(" ").replace(/\s+/g, " ").trim();
}

/** "https://openalex.org/W2741809807" → "W2741809807" */
function shortId(openAlexUrl: string): string {
  return openAlexUrl.split("/").pop() || openAlexUrl;
}

function isoDate(d: string | null): string {
  if (!d) return new Date().toISOString();
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/** The validated Finding-E Climate query (topic-id allowlist + cited-sort). */
async function fetchClimateWorks(): Promise<OpenAlexWork[]> {
  const since = new Date(Date.now() - CLIMATE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const topicFilter = CLIMATE_TOPIC_IDS.join("|");
  const filter = [
    `primary_topic.id:${topicFilter}`,
    "type:article",
    "is_paratext:false",
    "language:en",
    `from_publication_date:${since}`,
    `cited_by_count:>${CLIMATE_MIN_CITATIONS}`,
  ].join(",");
  const params = new URLSearchParams({
    filter,
    // Cited-sort is intentional for Climate: docs/data-sources-v2.md Finding E
    // showed it yields the cleanest, most layperson-usable sample. Idempotency
    // is preserved by fetchExistingSourceIds() + upsert-on-conflict, so
    // re-surfacing evergreen top papers just no-ops.
    sort: "cited_by_count:desc",
    per_page: String(FETCH_COUNT),
    select:
      "id,doi,title,display_name,publication_date,updated_date,cited_by_count,language,abstract_inverted_index,primary_location,primary_topic",
    mailto: MAILTO,
  });

  const res = await fetch(`${OPENALEX_WORKS}?${params.toString()}`, {
    headers: { "User-Agent": `Ohlo/0.1 (${MAILTO})` },
  });
  if (!res.ok) {
    throw new Error(`OpenAlex HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as { results?: OpenAlexWork[] };
  return data.results ?? [];
}

/**
 * One bulk lookup per category (instead of a per-work SELECT): returns the set
 * of source_ids already stored for these OpenAlex works.
 */
async function fetchExistingSourceIds(sourceIds: string[]): Promise<Set<string>> {
  if (sourceIds.length === 0) return new Set();
  const { data } = await supabase
    .from("papers")
    .select("source_id")
    .eq("source", "openalex")
    .in("source_id", sourceIds);
  return new Set((data ?? []).map((row) => row.source_id as string));
}

async function main() {
  console.log(`[openalex] CLIMATE-ONLY | target=${TARGET}, fetch=${FETCH_COUNT}`);
  const sampleZhHooks: string[] = [];

  let works: OpenAlexWork[];
  try {
    works = await fetchClimateWorks();
  } catch (err) {
    console.error(`[openalex] Climate fetch failed: ${(err as Error).message}`);
    process.exit(1);
  }
  console.log(`[openalex] fetched ${works.length} candidate works`);

  // Client-side Finding-E post-filters: OpenAlex can't filter on
  // primary_topic.score, so drop low-confidence topic leaks here, plus any
  // paratext that slipped past is_paratext:false (corrigenda/errata/etc).
  const filtered = works.filter((w) => {
    const score = w.primary_topic?.score ?? 0;
    if (score < MIN_TOPIC_SCORE) return false;
    const title = (w.title || w.display_name || "").trim();
    if (!title || PARATEXT_TITLE.test(title)) return false;
    return true;
  });
  console.log(
    `[openalex] ${filtered.length} survive score>=${MIN_TOPIC_SCORE} + paratext blocklist`,
  );

  const existingIds = await fetchExistingSourceIds(filtered.map((w) => shortId(w.id)));

  let inserted = 0;
  for (const work of filtered) {
    if (inserted >= TARGET) break;

    const title = (work.title || work.display_name || "").trim();
    const abstract = reconstructAbstract(work.abstract_inverted_index);
    if (!title || abstract.length < 200) continue; // need real text for the LLM

    const sid = shortId(work.id);
    const venue = work.primary_location?.source?.display_name?.trim() || "";
    const landing = work.doi || work.primary_location?.landing_page_url || work.id;

    try {
      if (existingIds.has(sid)) continue;

      const meta = await generatePaperMetadata({
        title,
        abstract,
        categories: [CLIMATE_LABEL, work.primary_topic?.display_name || ""].filter(Boolean),
      });

      // Score relevance (single-row batch — fine at ingest time per spec)
      const relevanceMap = await generateRelevance(
        [{ id: sid, title, hook_summary_en: meta.hook, hook_summary_zh: meta.hookZh }],
        openaiClient,
        OPENAI_MODEL_STR,
      );
      const rel = relevanceMap.get(sid);
      const relevanceRecord = rel
        ? {
            ...rel,
            structure: scoreStructure(meta.hook, meta.hookZh),
            scored_at: new Date().toISOString(),
          }
        : undefined;

      const payload = {
        source: "openalex",
        source_id: sid,
        // arxiv_id_base is NOT NULL + globally unique; reuse the OpenAlex
        // short id (W-ids never collide with arXiv ids).
        arxiv_id_base: sid,
        arxiv_id_version: 1,
        title,
        abstract,
        hook_summary_en: meta.hook,
        hook_summary_zh: meta.hookZh,
        plain_summary_en: meta.plainSummary,
        plain_summary_zh: meta.plainSummaryZh,
        tags: meta.tags,
        // Selected by the Climate topic allowlist, so the category is known;
        // store the curated value for clean persona routing.
        human_category: CLIMATE_HUMAN_CATEGORY,
        authors: [],
        primary_category: `openalex:${CLIMATE_LABEL}`,
        categories: [CLIMATE_LABEL],
        published_at: isoDate(work.publication_date),
        source_updated_at: isoDate(work.updated_date || work.publication_date),
        pdf_url: null,
        abs_url: landing,
        metadata: {
          source: "openalex",
          openalex_id: work.id,
          venue: venue || "OpenAlex",
          cited_by_count: work.cited_by_count,
          primary_topic: work.primary_topic?.display_name || null,
          primary_topic_score: work.primary_topic?.score ?? null,
          llm_human_category: meta.humanCategory,
          ...(relevanceRecord ? { relevance: relevanceRecord } : {}),
        },
      };

      const { error } = await supabase
        .from("papers")
        .upsert(payload, { onConflict: "arxiv_id_base" });
      if (error) {
        console.error(`  [FAIL] ${sid}: ${error.message}`);
        continue;
      }
      inserted += 1;
      if (sampleZhHooks.length < 5 && meta.hookZh) {
        sampleZhHooks.push(`[Climate] ${meta.hookZh}`);
      }
      console.log(`  [OK ${inserted}] ${sid} | ${venue.slice(0, 40)} | zh: ${meta.hookZh.slice(0, 30)}`);
      await sleep(150); // gentle on the OpenAI endpoint
    } catch (err) {
      console.error(`  [FAIL] ${sid}: ${(err as Error).message}`);
    }
  }

  console.log("\n[openalex] === SUMMARY ===");
  console.log(`  Climate inserted: ${inserted}`);
  console.log("\n[openalex] sample zh hooks:");
  for (const h of sampleZhHooks) console.log(`  - ${h}`);
}

main().catch((err) => {
  console.error("ingest-openalex crashed:", err);
  process.exit(1);
});
