/**
 * Wikidata SPARQL ingest — evergreen superlative facts for history / nature / space.
 *
 * Source: https://query.wikidata.org/sparql (CC0 — no license restrictions).
 * User-Agent header is required by Wikimedia terms.
 *
 * Mode: one-shot evergreen backfill (~40–70 rows after LLM null-skips).
 *       Safe to rerun — deduped by (source, source_id).
 *
 * Rows: source='wikidata', source_id=QID (or QID:queryKey where one item
 *       appears in multiple queries), human_category = domain id per query,
 *       abs_url=https://www.wikidata.org/wiki/QID,
 *       metadata.venue='Wikidata'.
 *
 * Usage:
 *   npx tsx scripts/ingest-wikidata.ts
 */

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: true, quiet: true });
loadDotenv({ path: ".env", override: false, quiet: true });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// ── env ──────────────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL_LOW_COST ?? "gpt-4o-mini";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ── META_HOOK_PATTERN — mirrors src/lib/llm.ts ───────────────────────────────
const META_HOOK_PATTERN =
  /这个新?(方法|技术|模型|模拟器|系统|研究)|^一[种个][^，。]{0,10}(方法|技术|模型|系统|工具|拍卖|模拟器|算法)|该研究|这项(研究|技术)|真吓人|太(神奇|可怕|疯狂)了|惊呆|绝了|[!！]\s*$|[—―–]|this (new )?(method|model|approach|technique|study|simulator|system)|the (researchers|study|paper)|(terrifying|mind-blowing|amazing)[.!]?\s*$/i;

// ── SPARQL query definitions ──────────────────────────────────────────────────

type WikiQuery = {
  key: string;
  domain: "history" | "nature" | "space";
  description: string; // used in LLM prompt context
  sparql: string;
};

const QUERIES: WikiQuery[] = [
  {
    key: "oldest_tree",
    domain: "nature",
    description: "Oldest known living tree by age",
    sparql: `
SELECT ?item ?itemLabel ?age ?locationLabel WHERE {
  ?item wdt:P31 wd:Q10884 .
  ?item wdt:P571 ?inception .
  BIND(YEAR(NOW()) - YEAR(?inception) AS ?age)
  OPTIONAL { ?item wdt:P131 ?location }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY ?age
LIMIT 5
`.trim(),
  },
  {
    key: "deepest_ocean",
    domain: "nature",
    description: "Deepest point in the ocean (Challenger Deep, Mariana Trench)",
    sparql: `
SELECT ?item ?itemLabel ?depth WHERE {
  VALUES ?item { wd:Q81103 }
  ?item wdt:P4511 ?depth .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
`.trim(),
  },
  {
    key: "highest_mountain",
    domain: "nature",
    description: "Highest mountain above sea level",
    sparql: `
SELECT ?item ?itemLabel ?elevation WHERE {
  ?item wdt:P31 wd:Q8502 .
  ?item wdt:P2044 ?elevation .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY DESC(?elevation)
LIMIT 1
`.trim(),
  },
  {
    key: "longest_reigning_monarch",
    domain: "history",
    description: "Longest-reigning monarch in recorded history",
    sparql: `
SELECT ?item ?itemLabel ?reignLength WHERE {
  VALUES ?item { wd:Q7742 }
  OPTIONAL { ?item wdt:P2937 ?term . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
LIMIT 1
`.trim(),
  },
  {
    key: "oldest_university",
    domain: "history",
    description: "Oldest continuously operating university in the world",
    sparql: `
SELECT ?item ?itemLabel ?inception WHERE {
  ?item wdt:P31/wdt:P279* wd:Q3918 .
  ?item wdt:P571 ?inception .
  FILTER(?inception < "1500-01-01T00:00:00Z"^^xsd:dateTime)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY ?inception
LIMIT 5
`.trim(),
  },
  {
    key: "largest_organism",
    domain: "nature",
    description: "Largest living organism by area (Pando, a clonal colony of quaking aspen)",
    sparql: `
SELECT ?item ?itemLabel ?area WHERE {
  VALUES ?item { wd:Q3046618 }
  OPTIONAL { ?item wdt:P2046 ?area . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
`.trim(),
  },
  {
    key: "animal_most_hearts",
    domain: "nature",
    description: "Animal with most heart chambers or pseudo-hearts (earthworm: 5 pairs of aortic arches)",
    sparql: `
SELECT ?item ?itemLabel WHERE {
  VALUES ?item { wd:Q4667 }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
`.trim(),
  },
  {
    key: "longest_lifespan_animal",
    domain: "nature",
    description: "Animal with longest confirmed natural lifespan (Greenland shark, 400+ years)",
    sparql: `
SELECT ?item ?itemLabel ?lifespan WHERE {
  VALUES ?item { wd:Q190772 }
  OPTIONAL { ?item wdt:P2250 ?lifespan . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
`.trim(),
  },
  {
    key: "oldest_recipe",
    domain: "history",
    description: "Oldest known written recipe (Sumerian beer recipe, ~3900 years old)",
    sparql: `
SELECT ?item ?itemLabel ?date WHERE {
  VALUES ?item { wd:Q3483180 }
  OPTIONAL { ?item wdt:P571 ?date . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
`.trim(),
  },
  {
    key: "first_photograph",
    domain: "history",
    description: "First surviving photograph (View from the Window at Le Gras, ~1826)",
    sparql: `
SELECT ?item ?itemLabel ?date WHERE {
  VALUES ?item { wd:Q193540 }
  OPTIONAL { ?item wdt:P571 ?date . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
`.trim(),
  },
  {
    key: "largest_empire",
    domain: "history",
    description: "Largest empire in history by land area (British Empire at peak)",
    sparql: `
SELECT ?item ?itemLabel ?area WHERE {
  ?item wdt:P31/wdt:P279* wd:Q48349 .
  ?item wdt:P2046 ?area .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY DESC(?area)
LIMIT 3
`.trim(),
  },
  {
    key: "closest_star",
    domain: "space",
    description: "Closest star system to the Sun (Alpha Centauri / Proxima Centauri)",
    sparql: `
SELECT ?item ?itemLabel ?distance WHERE {
  VALUES ?item { wd:Q7123 }
  OPTIONAL { ?item wdt:P2583 ?distance . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
`.trim(),
  },
  {
    key: "largest_moon_ratio",
    domain: "space",
    description: "Moon largest relative to its planet (Charon relative to Pluto — half its diameter)",
    sparql: `
SELECT ?item ?itemLabel ?diameter WHERE {
  VALUES ?item { wd:Q339 }
  OPTIONAL { ?item wdt:P2386 ?diameter . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
`.trim(),
  },
  {
    key: "longest_river",
    domain: "nature",
    description: "Longest river in the world (Nile or Amazon, debated)",
    sparql: `
SELECT ?item ?itemLabel ?length WHERE {
  ?item wdt:P31/wdt:P279* wd:Q4022 .
  ?item wdt:P2043 ?length .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY DESC(?length)
LIMIT 3
`.trim(),
  },
  {
    key: "oldest_company",
    domain: "history",
    description: "Oldest continuously operating company in the world (Kongo Gumi, 578 AD)",
    sparql: `
SELECT ?item ?itemLabel ?inception WHERE {
  ?item wdt:P31/wdt:P279* wd:Q4830453 .
  ?item wdt:P571 ?inception .
  FILTER(?inception < "1000-01-01T00:00:00Z"^^xsd:dateTime)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY ?inception
LIMIT 5
`.trim(),
  },
];

// ── SPARQL execution ──────────────────────────────────────────────────────────

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "OhloIngest/1.0 (github.com/Barryyep/knowtok)";

type SparqlBinding = Record<string, { type: string; value: string }>;
type SparqlResult = { results: { bindings: SparqlBinding[] } };

async function runSparql(sparql: string): Promise<SparqlBinding[]> {
  const res = await fetch(SPARQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/sparql-results+json",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({ query: sparql }).toString(),
  });
  if (!res.ok) {
    throw new Error(`SPARQL HTTP ${res.status}: ${await res.text().then((t) => t.slice(0, 200))}`);
  }
  const json = (await res.json()) as SparqlResult;
  return json.results?.bindings ?? [];
}

/** Extract the QID from a Wikidata entity URI like http://www.wikidata.org/entity/Q12345 */
function extractQid(uri: string): string {
  const match = uri.match(/\/(Q\d+)$/);
  return match?.[1] ?? uri;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeHook(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  const words = trimmed.split(" ").filter(Boolean);
  if (words.length <= 28) return trimmed;
  return `${words.slice(0, 28).join(" ").replace(/[,.!?;:]+$/, "")}.`;
}

// ── LLM: turn a SPARQL result row into a v5 hook ─────────────────────────────
//
// The FACT comes from Wikidata (CC0), the wording is entirely ours.

type WikidataInsight = {
  hook: string;
  hookZh: string;
  plainSummary: string;
  plainSummaryZh: string;
} | null;

async function generateWikidataInsight(
  query: WikiQuery,
  binding: SparqlBinding
): Promise<WikidataInsight> {
  // Flatten the binding into a readable fact string
  const factParts: string[] = [];
  for (const [key, val] of Object.entries(binding)) {
    if (key.endsWith("Label")) continue; // we'll use labels separately
    const label = binding[`${key}Label`]?.value ?? val.value;
    const display =
      val.type === "uri"
        ? extractQid(val.value)
        : val.value.length > 120
          ? val.value.slice(0, 120) + "…"
          : val.value;
    if (label !== display && label) {
      factParts.push(`${key}: ${label} (${display})`);
    } else {
      factParts.push(`${key}: ${display}`);
    }
  }
  const factStr = factParts.join(" | ");

  const prompt = [
    `You are turning a Wikidata fact into a punchy bilingual hook for a general-audience scroll feed.`,
    ``,
    `Query context: ${query.description}`,
    `Domain: ${query.domain}`,
    `Wikidata result: ${factStr}`,
    ``,
    `Instructions:`,
    `1) "hook": ONE verifiable fact in plain English, ≤100 characters. State the FACT ITSELF`,
    `   — a specific number, distance, age, or comparison. No exclamation marks. No em-dash or en-dash (— or –); use a comma instead.`,
    `   No template openers (Did you know / Scientists found). Numbers first where striking. End with a period.`,
    `2) "hookZh": Same fact in Chinese, ≤40 characters. Numbers first. No exclamation marks.`,
    `   No dashes (——、—、―; use comma instead). No meta-description (禁止描述数据来源). End with 句号.`,
    `3) "plainSummary": 2-3 sentence plain-English explanation for a curious 14-year-old.`,
    `4) "plainSummaryZh": Same in Chinese, 2-3 sentences.`,
    ``,
    `SKIP RULE: if the Wikidata result is empty, ambiguous, or cannot produce a surprising`,
    `verifiable fact, return: {"skip": true}`,
    ``,
    `GOOD hookZh examples (v5):`,
    `"地球最深处马里亚纳海沟约11公里深，比珠穆朗玛峰高出约2.2公里。"`,
    `"世界最古老的公司是日本金刚组，成立于公元578年，连续经营超过1400年。"`,
    ``,
    `Return strict JSON: {"hook":"...","hookZh":"...","plainSummary":"...","plainSummaryZh":"..."}`,
    `OR if no fact: {"skip": true}`,
  ].join("\n");

  const tryOnce = async () => {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You turn Wikidata facts into bilingual hooks for a general-audience feed. Output JSON only.",
        },
        { role: "user", content: prompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as {
      skip?: boolean;
      hook?: string;
      hookZh?: string;
      plainSummary?: string;
      plainSummaryZh?: string;
    };
  };

  const first = await tryOnce();
  if (first.skip) return null;

  const hook = normalizeHook(first.hook ?? query.description);
  const hookZh = first.hookZh?.trim() ?? "";

  // Retry guard — mirrors META_HOOK_PATTERN logic
  if (META_HOOK_PATTERN.test(hookZh) || META_HOOK_PATTERN.test(hook)) {
    const second = await tryOnce();
    if (second.skip) return null;
    const h2 = normalizeHook(second.hook ?? query.description);
    const hz2 = second.hookZh?.trim() ?? "";
    const clean = !META_HOOK_PATTERN.test(hz2) && !META_HOOK_PATTERN.test(h2);
    return {
      hook: clean ? h2 : hook,
      hookZh: clean ? hz2 : hookZh,
      plainSummary: (clean ? second.plainSummary : first.plainSummary)?.trim() ?? "",
      plainSummaryZh: (clean ? second.plainSummaryZh : first.plainSummaryZh)?.trim() ?? "",
    };
  }

  return {
    hook,
    hookZh,
    plainSummary: first.plainSummary?.trim() ?? "",
    plainSummaryZh: first.plainSummaryZh?.trim() ?? "",
  };
}

// ── existing source_id check ──────────────────────────────────────────────────

async function fetchExistingSourceIds(sourceIds: string[]): Promise<Set<string>> {
  if (sourceIds.length === 0) return new Set();
  const { data } = await supabase
    .from("papers")
    .select("source_id")
    .eq("source", "wikidata")
    .in("source_id", sourceIds);
  return new Set((data ?? []).map((row) => row.source_id as string));
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[wikidata] running ${QUERIES.length} curated SPARQL queries`);

  // Collect all candidate rows before LLM to enable bulk dedupe check
  type Candidate = {
    query: WikiQuery;
    binding: SparqlBinding;
    qid: string;
    sourceId: string;
  };

  const candidates: Candidate[] = [];

  for (const query of QUERIES) {
    console.log(`  [SPARQL] ${query.key} (${query.domain})`);
    try {
      const bindings = await runSparql(query.sparql);
      if (bindings.length === 0) {
        console.warn(`    [EMPTY] no results for ${query.key}`);
        continue;
      }
      // Take top result (queries are ordered by relevance/superlative)
      const top = bindings[0];
      if (!top) continue;
      const itemUri = top["item"]?.value ?? "";
      const qid = extractQid(itemUri);

      if (!qid.startsWith("Q")) {
        console.warn(`    [SKIP] no valid QID in result for ${query.key}`);
        continue;
      }

      // source_id: QID alone is enough unless we expect one QID in multiple queries
      const sourceId = qid;

      candidates.push({ query, binding: top, qid, sourceId });
      console.log(`    → QID=${qid} label="${top["itemLabel"]?.value ?? "?"}"`);
    } catch (err) {
      console.error(`    [FAIL] SPARQL error for ${query.key}: ${(err as Error).message}`);
    }
    await sleep(800); // be polite to Wikidata servers
  }

  console.log(`\n[wikidata] ${candidates.length} candidates after SPARQL, checking dedupe...`);

  const allSourceIds = candidates.map((c) => c.sourceId);
  const existing = await fetchExistingSourceIds(allSourceIds);
  const fresh = candidates.filter((c) => !existing.has(c.sourceId));
  const preSkipped = candidates.length - fresh.length;
  console.log(`[wikidata] ${fresh.length} new rows to process (${preSkipped} already in DB)`);

  let inserted = 0;
  let nullFact = 0;
  const perDomain: Record<string, number> = {};
  const sampleZhHooks: string[] = [];

  for (const { query, binding, qid, sourceId } of fresh) {
    try {
      const insight = await generateWikidataInsight(query, binding);
      if (!insight) {
        nullFact += 1;
        console.log(`  [NULL] ${query.key} (${qid}): LLM returned skip`);
        continue;
      }

      const absUrl = `https://www.wikidata.org/wiki/${qid}`;
      const label = binding["itemLabel"]?.value ?? query.description;

      const payload = {
        source: "wikidata",
        source_id: sourceId,
        arxiv_id_base: `wikidata-${sourceId}`,
        arxiv_id_version: 1,
        title: label,
        abstract: `${query.description}. QID: ${qid}. Raw result: ${JSON.stringify(binding).slice(0, 500)}`,
        hook_summary_en: insight.hook,
        hook_summary_zh: insight.hookZh,
        plain_summary_en: insight.plainSummary,
        plain_summary_zh: insight.plainSummaryZh,
        tags: [],
        human_category: query.domain,
        authors: [],
        primary_category: `wikidata:${query.domain}`,
        categories: [query.domain],
        published_at: new Date().toISOString(),
        source_updated_at: new Date().toISOString(),
        pdf_url: null,
        abs_url: absUrl,
        metadata: {
          source: "wikidata",
          venue: "Wikidata",
          qid,
          queryKey: query.key,
          domain: query.domain,
        },
      };

      const { error } = await supabase
        .from("papers")
        .upsert(payload, { onConflict: "arxiv_id_base" });

      if (error) {
        console.error(`  [FAIL] ${query.key} (${qid}): ${error.message}`);
        continue;
      }

      inserted += 1;
      perDomain[query.domain] = (perDomain[query.domain] ?? 0) + 1;
      if (sampleZhHooks.length < 5 && insight.hookZh) {
        sampleZhHooks.push(`[${query.domain}] ${insight.hookZh}`);
      }
      console.log(
        `  [OK ${inserted}] ${query.key} (${qid}) → ${query.domain} | zh: ${insight.hookZh.slice(0, 35)}`
      );
      await sleep(150);
    } catch (err) {
      console.error(`  [FAIL] ${query.key} (${qid}): ${(err as Error).message}`);
    }
  }

  console.log("\n[wikidata] === SUMMARY ===");
  console.log(`  inserted: ${inserted}`);
  console.log(`  skipped (already present): ${preSkipped}`);
  console.log(`  skipped (LLM null / no fact): ${nullFact}`);
  console.log("  by domain:");
  for (const [d, n] of Object.entries(perDomain)) console.log(`    ${d}: ${n}`);
  console.log("\n[wikidata] sample zh hooks:");
  for (const h of sampleZhHooks) console.log(`  - ${h}`);
}

main().catch((err) => {
  console.error("ingest-wikidata crashed:", err);
  process.exit(1);
});
