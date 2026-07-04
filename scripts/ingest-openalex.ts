/**
 * OpenAlex ingest — broadens KnowTok beyond arXiv into disciplines arXiv
 * barely covers (clinical health, personal finance, food science, climate).
 *
 * Pipeline mirrors the arXiv one:
 *   OpenAlex works API (JSON) → reconstruct abstract from the inverted index
 *   → generatePaperMetadata (same OpenAI generator, banned-openers rule)
 *   → upsert into `papers` with source='openalex'.
 *
 * Usage:
 *   npx tsx scripts/ingest-openalex.ts               # default per-category target
 *   npx tsx scripts/ingest-openalex.ts --target 30   # override target/category
 */

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: true, quiet: true });
loadDotenv({ path: ".env", override: false, quiet: true });

import { createClient } from "@supabase/supabase-js";
import { generatePaperMetadata } from "../src/lib/llm";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Polite-pool contact (OpenAlex asks for a mailto so they can reach you).
const MAILTO = "hello@knowtok.app";
const OPENALEX_WORKS = "https://api.openalex.org/works";

/**
 * Curated topic map: our 5 human categories ↔ OpenAlex "field" ids
 * (the stable Scopus-derived level in domain>field>subfield>topic).
 * We deliberately pick fields where arXiv coverage is weak.
 * Field ids: https://api.openalex.org/fields
 */
const CATEGORY_MAP: Array<{
  humanCategory: string;
  // OpenAlex primary_topic.field.id value(s) — a work matches if ANY apply.
  fieldIds: number[];
  label: string;
}> = [
  // Clinical / biomedical — arXiv has almost none of this.
  { humanCategory: "Your Health", fieldIds: [27], label: "Medicine" },
  // Economics, Econometrics & Finance — personal-money-relevant research.
  { humanCategory: "Your Money", fieldIds: [20], label: "Economics, Econometrics and Finance" },
  // Agricultural & Biological Sciences (food science lives here).
  { humanCategory: "Your Food", fieldIds: [11], label: "Agricultural and Biological Sciences" },
  // Environmental Science — climate, sustainability.
  { humanCategory: "Climate", fieldIds: [23], label: "Environmental Science" },
];

const TARGET_PER_CATEGORY = (() => {
  const idx = process.argv.indexOf("--target");
  if (idx >= 0) {
    const v = Number.parseInt(process.argv[idx + 1] || "", 10);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return 28; // a little headroom above the ≥25 target
})();

// How many OA works to pull per category before filtering/LLM. We order
// newest-first (publication_date desc) so that each daily run surfaces works
// that did NOT exist yesterday — sorting by citations would keep returning the
// same evergreen top-cited papers, which alreadyExists() would just skip, so
// daily runs would stop bringing anything new. We then keep the first TARGET
// that reconstruct into a usable abstract.
const FETCH_PER_CATEGORY = 90;

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
    display_name: string | null;
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

async function fetchWorks(fieldIds: number[]): Promise<OpenAlexWork[]> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const fieldFilter = fieldIds.map((f) => `fields/${f}`).join("|");
  const filter = [
    `primary_topic.field.id:${fieldFilter}`,
    `from_publication_date:${since}`,
    "is_oa:true",
    "has_abstract:true",
    "language:en",
  ].join(",");
  const params = new URLSearchParams({
    filter,
    // Newest-first so daily runs ingest works published since the last run
    // (idempotent: alreadyExists() + upsert-on-conflict skip anything already
    // stored). cited_by_count desc would re-surface the same evergreen papers.
    sort: "publication_date:desc",
    per_page: String(FETCH_PER_CATEGORY),
    select:
      "id,doi,title,display_name,publication_date,updated_date,cited_by_count,language,abstract_inverted_index,primary_location,primary_topic",
    mailto: MAILTO,
  });

  const res = await fetch(`${OPENALEX_WORKS}?${params.toString()}`, {
    headers: { "User-Agent": `KnowTok/0.1 (${MAILTO})` },
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
  console.log(`[openalex] target=${TARGET_PER_CATEGORY}/category, fetch=${FETCH_PER_CATEGORY}/category`);
  const perCategory: Record<string, number> = {};
  const sampleZhHooks: string[] = [];

  for (const cat of CATEGORY_MAP) {
    console.log(`\n[openalex] === ${cat.humanCategory} (${cat.label}) ===`);
    let works: OpenAlexWork[];
    try {
      works = await fetchWorks(cat.fieldIds);
    } catch (err) {
      console.error(`[openalex] fetch failed for ${cat.humanCategory}: ${(err as Error).message}`);
      perCategory[cat.humanCategory] = 0;
      continue;
    }
    console.log(`[openalex] fetched ${works.length} candidate works`);

    const existingIds = await fetchExistingSourceIds(works.map((w) => shortId(w.id)));

    let inserted = 0;
    for (const work of works) {
      if (inserted >= TARGET_PER_CATEGORY) break;

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
          categories: [cat.label, work.primary_topic?.display_name || ""].filter(Boolean),
        });

        const nowIso = new Date().toISOString();
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
          // We selected by field on purpose, so the category is known; storing
          // the curated value guarantees clean persona routing / target counts.
          human_category: cat.humanCategory,
          authors: [],
          primary_category: `openalex:${cat.label}`,
          categories: [cat.label],
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
            llm_human_category: meta.humanCategory,
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
        if (sampleZhHooks.length < 3 && meta.hookZh) {
          sampleZhHooks.push(`[${cat.humanCategory}] ${meta.hookZh}`);
        }
        console.log(`  [OK ${inserted}] ${sid} | ${venue.slice(0, 40)} | zh: ${meta.hookZh.slice(0, 30)}`);
        await sleep(150); // gentle on the OpenAI endpoint
      } catch (err) {
        console.error(`  [FAIL] ${sid}: ${(err as Error).message}`);
      }
    }

    perCategory[cat.humanCategory] = inserted;
    console.log(`[openalex] ${cat.humanCategory}: inserted ${inserted}`);
    await sleep(300); // gentle on OpenAlex between categories
  }

  console.log("\n[openalex] === SUMMARY ===");
  let total = 0;
  for (const [c, n] of Object.entries(perCategory)) {
    console.log(`  ${c}: ${n}`);
    total += n;
  }
  console.log(`  TOTAL: ${total}`);
  console.log("\n[openalex] sample zh hooks:");
  for (const h of sampleZhHooks) console.log(`  - ${h}`);
}

main().catch((err) => {
  console.error("ingest-openalex crashed:", err);
  process.exit(1);
});
