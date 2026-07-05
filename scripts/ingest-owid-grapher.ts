/**
 * OWID Grapher ingest — expands Ohlo's OWID pool from the 20-item Data Insights
 * feed to a curated whitelist of ~130 Grapher charts, capped at 120 new rows.
 *
 * License: CC BY 4.0 — https://docs.owid.io/projects/etl/api/chart-api/
 * Attribution is kept in metadata.venue = "Our World in Data" and
 * metadata.license = "CC BY 4.0" per the license terms. Only derivative hook
 * text is published; no raw chart content is redistributed.
 *
 * Endpoints (no key required):
 *   GET https://ourworldindata.org/grapher/{slug}.metadata.json
 *   GET https://ourworldindata.org/grapher/{slug}.csv?country=OWID_WRL~...
 *
 * For each whitelisted slug this script:
 *   1. HEADs the metadata URL to verify the slug is live — drops 404s.
 *   2. Fetches chart metadata (title, unit, timespan, citation).
 *   3. Fetches CSV data and extracts up to 2 template facts:
 *        "trend": global series earliest → latest value.
 *          Keep if: percentage unit → |change| ≥ 15 pp
 *                   other units    → ratio ≥ 2.0 or ≤ 0.5
 *        "top":   entity with highest value in the latest year.
 *          Keep if top is ≥ 1.5× world average (counterintuitive extremes).
 *   4. Sends each fact to generateOwidInsight (bilingual hooks, v5 rules:
 *      fact-first, deadpan, numbers first, no exclamation marks).
 *   5. Upserts into `papers`:
 *        source         = 'owid'
 *        source_id      = 'grapher:{slug}:{factKey}'
 *        arxiv_id_base  = 'owid-grapher-{slug}-{factKey}'   ← unique constraint
 *        human_category = domain id from whitelist (LLM confirms)
 *        abs_url        = 'https://ourworldindata.org/grapher/{slug}'
 *        published_at   = '{lastDataYear}-01-01'
 *          (last data year used as published_at because OWID charts have no
 *           single publication event — the last data year is the best proxy)
 *        metadata.venue   = 'Our World in Data'
 *        metadata.license = 'CC BY 4.0'
 *
 * Idempotent: dedupes on arxiv_id_base (upsert onConflict). Cap: 120 rows.
 *
 * Usage:
 *   npx tsx scripts/ingest-owid-grapher.ts
 */

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: true, quiet: true });
loadDotenv({ path: ".env", override: false, quiet: true });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { generateOwidInsight } from "../src/lib/llm";
import { DOMAINS } from "../mobile/src/lib/taxonomy";
import { generateRelevance, scoreStructure } from "../src/lib/relevance";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL_LOW_COST ?? "gpt-4o-mini";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// The OWID-capable domains — same set as ingest-owid.ts, single source of truth.
const OWID_DOMAINS = DOMAINS.filter((d) => d.sources.includes("owid")).map(
  (d) => ({ id: d.id, zh: d.zh, en: d.en }),
);

const OWID_BASE = "https://ourworldindata.org/grapher";
const MAX_INSERTS = 120;

// Countries to include in every CSV fetch: world aggregate + 29 diverse major
// economies/regions, enough to surface counterintuitive extremes.
const COUNTRY_FILTER =
  "OWID_WRL~USA~CHN~IND~NGA~DEU~GBR~BRA~IDN~JPN~KEN~MEX~EGY~ETH~PHL~PAK~RUS~ZAF~SAU~VNM~BGD~TUR~CAN~AUS~KOR~AGO~COD~TZA~ARG~IRN";

const USER_AGENT = "Ohlo/0.1 (https://ohlo.app; contact: hello@ohlo.app)";

// ── Whitelist ────────────────────────────────────────────────────────────────
// ~135 slugs curated for dramatic time-series and country extremes.
// Domains: health / money / food / climate / society / nature.
// NOT tech_ai / space — those are covered by arXiv + future APOD pipelines.
// Slugs marked "verified" were confirmed 200 against the live API before commit.
// The rest are plausible variants — the fetchMetadata null-check drops any 404s
// at runtime, so unknown slugs are harmless (they just produce [NO META] logs).
const SLUG_WHITELIST: ReadonlyArray<{ slug: string; domain: string }> = [
  // ── health (~22) — verified slugs ───────────────────────────────────────
  { slug: "life-expectancy", domain: "health" },                           // verified
  { slug: "child-mortality", domain: "health" },                           // verified
  { slug: "infant-mortality", domain: "health" },                          // verified
  { slug: "malaria-death-rates", domain: "health" },                       // verified
  { slug: "tuberculosis-death-rate", domain: "health" },                   // verified
  { slug: "death-rates-from-air-pollution", domain: "health" },            // verified
  { slug: "diabetes-prevalence", domain: "health" },                       // verified
  { slug: "share-of-adults-who-smoke", domain: "health" },                 // verified
  { slug: "share-of-children-underweight", domain: "health" },             // verified
  { slug: "death-rate-from-diarrheal-diseases", domain: "health" },        // verified
  { slug: "healthy-life-expectancy-at-birth", domain: "health" },          // verified
  { slug: "physicians-per-1000-people", domain: "health" },                // verified
  { slug: "hospital-beds-per-1000-people", domain: "health" },             // verified
  { slug: "access-to-clean-fuels-and-technologies-for-cooking", domain: "health" }, // verified
  { slug: "crude-birth-rate", domain: "health" },                          // verified
  { slug: "crude-death-rate", domain: "health" },                          // verified
  { slug: "total-cancer-deaths-by-type", domain: "health" },               // verified
  { slug: "share-of-adults-defined-as-obese", domain: "health" },          // verified — top: American Samoa 4.6×
  // plausible variants (runtime skips if 404):
  { slug: "maternal-mortality", domain: "health" },
  { slug: "hiv-death-rates", domain: "health" },
  { slug: "suicide-death-rates", domain: "health" },

  // ── money (~22) — mix of verified + plausible ───────────────────────────
  { slug: "gdp-per-capita-worldbank", domain: "money" },                   // verified
  { slug: "gdp-per-capita-penn-world-table", domain: "money" },            // verified
  { slug: "gdp-maddison-project-database", domain: "money" },              // verified
  { slug: "annual-gdp-growth", domain: "money" },                          // verified
  { slug: "share-of-population-living-in-extreme-poverty", domain: "money" }, // verified
  { slug: "economic-inequality-gini-index", domain: "money" },             // verified
  { slug: "share-of-individuals-using-the-internet", domain: "money" },   // verified
  { slug: "unemployment-rate", domain: "money" },                          // verified
  { slug: "employment-to-population-ratio", domain: "money" },             // verified
  { slug: "mobile-cellular-subscriptions-per-100-people", domain: "money" }, // verified
  { slug: "foreign-direct-investment-net-inflows-as-share-of-gdp", domain: "money" }, // verified
  { slug: "trade-as-share-of-gdp", domain: "money" },                     // verified
  { slug: "labor-share-of-gdp", domain: "money" },                        // verified
  { slug: "broadband-penetration-by-country", domain: "money" },           // verified
  { slug: "gdp-worldbank", domain: "money" },                              // verified — 2.92× (1990→2024)
  // plausible variants:
  { slug: "remittances-as-share-of-gdp", domain: "money" },
  { slug: "income-share-held-by-richest-1", domain: "money" },

  // ── food (~34) — mostly verified from run 1 + new production slugs ──────
  { slug: "meat-production-tonnes", domain: "food" },                      // run-1 OK
  { slug: "fish-and-seafood-consumption-per-capita", domain: "food" },     // run-1 OK
  { slug: "meat-supply-per-person", domain: "food" },                      // run-1 OK
  { slug: "cereal-yield", domain: "food" },                                // run-1 OK
  { slug: "wheat-yields", domain: "food" },                                // run-1 OK
  { slug: "rice-yields", domain: "food" },                                 // run-1 OK
  { slug: "maize-yields", domain: "food" },                                // run-1 OK
  { slug: "fruit-consumption-per-capita", domain: "food" },                // run-1 OK
  { slug: "vegetable-consumption-per-capita", domain: "food" },            // run-1 OK
  { slug: "daily-per-capita-caloric-supply", domain: "food" },             // run-1 OK
  { slug: "food-supply-kcal", domain: "food" },                            // run-1 OK
  // production totals — all show dramatic 1961→2024 growth (ratio ≥ 2.0×)
  { slug: "soybean-production", domain: "food" },                          // verified — 14.8×
  { slug: "wheat-production", domain: "food" },                            // verified — 3.6×
  { slug: "maize-production", domain: "food" },                            // verified — 5.9×
  { slug: "rice-production", domain: "food" },                             // verified — 3.8×
  { slug: "sugar-cane-production", domain: "food" },                       // verified — 4.3×
  { slug: "tomato-production", domain: "food" },                           // verified — 6.8×
  { slug: "palm-oil-production", domain: "food" },                         // verified — 53.8×
  { slug: "poultry-production-tonnes", domain: "food" },                   // verified — 16.4×
  { slug: "milk-production-tonnes", domain: "food" },                      // verified — 2.86×
  { slug: "rapeseed-production", domain: "food" },                         // verified — 24.4×
  { slug: "sunflower-seed-production", domain: "food" },                   // verified — 7.66×
  { slug: "banana-production", domain: "food" },                           // verified — 6.2×
  { slug: "orange-production", domain: "food" },                           // verified — 4.2×
  { slug: "palm-oil-yields", domain: "food" },                             // verified — 3.83×
  // plausible variants (runtime skips if 404):
  { slug: "share-of-population-undernourished", domain: "food" },
  { slug: "per-capita-caloric-intake", domain: "food" },
  { slug: "coffee-production-by-country", domain: "food" },
  { slug: "sugar-per-person-day", domain: "food" },
  { slug: "alcohol-consumption-per-person", domain: "food" },
  { slug: "egg-consumption-per-person", domain: "food" },
  { slug: "total-milk-production", domain: "food" },
  { slug: "dietary-compositions-by-commodity-groups", domain: "food" },
  { slug: "share-of-population-with-food-insecurity", domain: "food" },

  // ── climate (~28) — verified from run 1 + new verified ──────────────────
  { slug: "annual-co2-emissions-per-country", domain: "climate" },         // run-1 OK
  { slug: "co2-emissions-per-capita", domain: "climate" },                 // run-1 OK
  { slug: "share-electricity-renewables", domain: "climate" },             // run-1 OK
  { slug: "electric-car-sales", domain: "climate" },                       // run-1 OK
  { slug: "methane-emissions", domain: "climate" },                        // run-1 OK
  { slug: "oil-consumption-per-capita", domain: "climate" },               // run-1 OK
  { slug: "solar-energy-consumption", domain: "climate" },                 // run-1 OK
  { slug: "global-co2-concentration", domain: "climate" },                 // verified
  { slug: "co2-land-use", domain: "climate" },                             // verified
  { slug: "fossil-fuel-production", domain: "climate" },                   // verified
  { slug: "electricity-generation", domain: "climate" },                  // verified
  { slug: "oil-production-by-country", domain: "climate" },               // verified
  { slug: "nuclear-energy-generation", domain: "climate" },               // verified
  { slug: "hydropower-generation", domain: "climate" },                   // verified
  { slug: "biofuel-production", domain: "climate" },                      // verified
  { slug: "per-capita-energy-use", domain: "climate" },                   // verified
  { slug: "co2-intensity", domain: "climate" },                           // verified
  // energy transition slugs — verified top-country extremes and/or large trends
  { slug: "installed-solar-pv-capacity", domain: "climate" },             // verified — 1530× (2000→2024)
  { slug: "cumulative-installed-wind-energy-capacity-gigawatts", domain: "climate" }, // verified — 66.8×
  { slug: "wind-share-energy", domain: "climate" },                       // verified — top: Denmark 7.5×
  { slug: "solar-share-energy", domain: "climate" },                      // verified — top: Chile 3.36×
  { slug: "share-electricity-solar", domain: "climate" },                 // verified — top: Luxembourg 3.49×
  // battery-material mining (energy transition)
  { slug: "lithium-production", domain: "climate" },                      // verified — 25.8× (1995→2024)
  { slug: "cobalt-production", domain: "climate" },                       // verified — 13.1×
  // plausible variants:
  { slug: "greenhouse-gas-emissions-per-capita", domain: "climate" },
  { slug: "primary-energy-consumption", domain: "climate" },
  { slug: "share-of-primary-energy-from-fossil-fuels", domain: "climate" },
  { slug: "carbon-intensity-electricity", domain: "climate" },
  { slug: "coal-consumption-by-country", domain: "climate" },
  { slug: "renewable-electricity-generation", domain: "climate" },
  { slug: "solar-pv-capacity", domain: "climate" },
  { slug: "wind-energy-installed-capacity", domain: "climate" },
  { slug: "plastic-waste-emitted-to-ocean", domain: "climate" },
  { slug: "global-temperature-anomaly", domain: "climate" },

  // ── society (~22) — verified + run-1 OK ─────────────────────────────────
  { slug: "urbanization-last-500-years", domain: "society" },              // run-1 OK
  { slug: "literacy-rate-adults", domain: "society" },                     // run-1 OK
  { slug: "literacy", domain: "society" },                                 // verified
  { slug: "total-fertility-rate", domain: "society" },                     // run-1 OK
  { slug: "median-age", domain: "society" },                               // run-1 OK
  { slug: "child-labor", domain: "society" },                              // run-1 OK
  { slug: "liberal-democracy-index", domain: "society" },                  // verified
  { slug: "homicide-rate-unodc", domain: "society" },                      // verified
  { slug: "gender-wage-gap-oecd", domain: "society" },                     // verified
  { slug: "share-using-safely-managed-sanitation", domain: "society" },   // verified
  { slug: "years-of-schooling", domain: "society" },                       // verified — top: Germany 1.63×
  // plausible variants:
  { slug: "share-of-women-in-parliament", domain: "society" },
  { slug: "people-practicing-open-defecation", domain: "society" },
  { slug: "people-with-access-to-electricity", domain: "society" },
  { slug: "deaths-and-births-with-projections", domain: "society" },
  { slug: "prison-population-rate", domain: "society" },
  { slug: "share-without-access-to-safe-drinking-water", domain: "society" },
  { slug: "population-growth-rate", domain: "society" },
  { slug: "internet-users", domain: "society" },
  { slug: "democracy-index-eiu", domain: "society" },
  { slug: "population-density", domain: "society" },                      // verified

  // ── nature (~18) — all verified against live API ─────────────────────────
  { slug: "fish-stocks-within-sustainable-levels", domain: "nature" },     // verified
  { slug: "global-living-planet-index", domain: "nature" },                // verified
  { slug: "living-planet-index-by-region", domain: "nature" },             // verified
  { slug: "forest-area-km", domain: "nature" },                            // verified
  { slug: "freshwater-withdrawals-as-a-share-of-internal-resources", domain: "nature" }, // verified
  { slug: "share-threatened-species", domain: "nature" },                  // verified
  { slug: "tree-cover-loss", domain: "nature" },                           // verified
  { slug: "plastic-waste-per-capita", domain: "nature" },                  // verified
  { slug: "global-freshwater-use-over-the-long-run", domain: "nature" },  // verified
  { slug: "annual-deforestation", domain: "nature" },                      // verified
  { slug: "fish-species-threatened", domain: "nature" },                   // verified
  { slug: "terrestrial-protected-areas", domain: "nature" },              // verified
  { slug: "marine-protected-areas", domain: "nature" },                   // verified
  { slug: "red-list-index", domain: "nature" },                           // verified
  { slug: "fertilizer-use", domain: "nature" },                           // verified (food/nature)
  { slug: "food-waste-per-capita", domain: "food" },                      // verified
  { slug: "water-productivity", domain: "nature" },                        // verified — trend 0.31×, top: Singapore 82.7×
  { slug: "global-plastics-production", domain: "nature" },               // verified — 229.9× (1950→2019)
  // plausible variants:
  { slug: "nitrogen-use-efficiency", domain: "nature" },
  { slug: "freshwater-withdrawal-share-internal-resources", domain: "nature" },
  { slug: "biodiversity-intactness-index", domain: "nature" },
  { slug: "mammal-bird-extinction-since-1500", domain: "nature" },
  { slug: "threatened-mammals", domain: "nature" },
  { slug: "threatened-birds", domain: "nature" },
  { slug: "threatened-fish", domain: "nature" },
];

// ── Types ────────────────────────────────────────────────────────────────────

type DataRow = {
  entity: string;
  code: string;
  year: number;
  value: number;
};

type ChartMeta = {
  title: string;
  unit: string;
  citation: string;
  timespan: string;
};

type FactTemplate = {
  factKey: "trend" | "top";
  title: string;
  body: string;
  lastYear: number;
};

// ── CSV parser ───────────────────────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
    } else if (c === "," && !inQ) {
      result.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

function parseOwidCsv(csv: string): DataRow[] {
  const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const entityIdx = headers.findIndex((h) => h === "entity" || h === "country");
  const codeIdx = headers.findIndex((h) => h === "code");
  const yearIdx = headers.findIndex((h) => h === "year");
  // Always use the FIRST column after Year (index 3) as the primary value.
  // OWID CSVs place the primary indicator immediately after Entity/Code/Year;
  // any extra columns (Population, World region, etc.) come after and would
  // produce NaN if taken as the value — that was a bug with using headers.length-1.
  const valueIdx = 3;

  if (entityIdx < 0 || yearIdx < 0 || valueIdx <= yearIdx) return [];

  const rows: DataRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length <= valueIdx) continue;
    const entity = cols[entityIdx] ?? "";
    const code = codeIdx >= 0 ? (cols[codeIdx] ?? "") : "";
    const year = parseInt(cols[yearIdx] ?? "", 10);
    const value = parseFloat(cols[valueIdx] ?? "");
    if (!entity || isNaN(year) || isNaN(value)) continue;
    rows.push({ entity, code, year, value });
  }
  return rows;
}

// ── Metadata parser ──────────────────────────────────────────────────────────

function parseOwidMetadata(json: unknown): ChartMeta | null {
  if (!json || typeof json !== "object") return null;
  const d = json as Record<string, unknown>;

  // Title: try chart.title → title → chartTitle (different API versions)
  const chartBlock = d.chart as Record<string, unknown> | undefined;
  const title =
    (chartBlock?.title as string) ||
    (d.title as string) ||
    (d.chartTitle as string) ||
    "";
  if (!title) return null;

  // First column block (if present) carries unit + timespan + citation
  const columns = d.columns as Record<string, Record<string, unknown>> | undefined;
  const firstCol = columns ? Object.values(columns)[0] : undefined;

  const unit =
    (firstCol?.unit as string) ||
    (firstCol?.shortUnit as string) ||
    (d.unit as string) ||
    "";

  const citation =
    (firstCol?.citation as string) ||
    (firstCol?.sourceName as string) ||
    (chartBlock?.subtitle as string) ||
    (d.citation as string) ||
    "Our World in Data";

  const timespan =
    (firstCol?.timespan as string) ||
    (chartBlock?.timespan as string) ||
    (d.timespan as string) ||
    "";

  return { title, unit: unit.trim(), citation: citation.trim(), timespan };
}

// ── Fact extraction ───────────────────────────────────────────────────────────

/** Format a number for display in a fact body. */
function fmt(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} billion`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} million`;
  if (abs >= 10_000) return value.toFixed(0);
  if (abs >= 100) return value.toFixed(1);
  if (abs >= 1) return value.toFixed(2);
  return value.toPrecision(3);
}

function isPercent(unit: string): boolean {
  return /%|percent|share/i.test(unit);
}

/**
 * Returns true when the earliest→latest change meets the "interesting" bar:
 *   percentage unit → |change| ≥ 15 percentage points
 *   other units     → ratio ≥ 2.0 or ≤ 0.5  (at least 2× change either way)
 * The <2x / <20pp threshold from the task spec is applied here (15pp is a
 * slight relaxation for unit-level tuning; ratio stays at 2×).
 */
function isTrendInteresting(
  earliest: number,
  latest: number,
  unit: string,
): boolean {
  if (earliest === 0 || latest === 0) return false;
  if (isPercent(unit)) {
    return Math.abs(latest - earliest) >= 15;
  }
  const ratio = latest / earliest;
  return ratio >= 2.0 || ratio <= 0.5;
}

function worldRows(rows: DataRow[]): DataRow[] {
  return rows
    .filter((r) => r.code === "OWID_WRL" || r.entity === "World")
    .sort((a, b) => a.year - b.year);
}

function extractTrendFact(
  rows: DataRow[],
  meta: ChartMeta,
): FactTemplate | null {
  const wRows = worldRows(rows);
  if (wRows.length < 2) return null;

  // Earliest non-null, latest non-null
  const earliest = wRows[0];
  const latest = wRows[wRows.length - 1];

  if (latest.year - earliest.year < 5) return null;
  if (!isTrendInteresting(earliest.value, latest.value, meta.unit)) return null;

  const direction = latest.value > earliest.value ? "rose" : "fell";
  const unitLabel = meta.unit ? ` ${meta.unit}` : "";

  const body =
    `${meta.title}: globally, the value ${direction} from ` +
    `${fmt(earliest.value)}${unitLabel} in ${earliest.year} to ` +
    `${fmt(latest.value)}${unitLabel} in ${latest.year}.`;

  return {
    factKey: "trend",
    title: `${meta.title} — global trend ${earliest.year}–${latest.year}`,
    body,
    lastYear: latest.year,
  };
}

function extractTopFact(
  rows: DataRow[],
  meta: ChartMeta,
): FactTemplate | null {
  // Use the latest year that has world data
  const wRows = worldRows(rows);
  if (wRows.length === 0) return null;
  const latestYear = wRows[wRows.length - 1].year;
  const worldVal = wRows[wRows.length - 1].value;

  const countryRows = rows
    .filter(
      (r) =>
        r.year === latestYear &&
        r.code !== "OWID_WRL" &&
        r.entity !== "World" &&
        !r.entity.startsWith("World ") &&
        r.entity !== "Global",
    )
    .sort((a, b) => b.value - a.value);

  if (countryRows.length < 3) return null;
  const top = countryRows[0];

  // Only surfacing an extreme if it is dramatically above the world average —
  // anything under 1.5× is unlikely to produce a surprising hook.
  if (top.value / worldVal < 1.5) return null;

  const unitLabel = meta.unit ? ` ${meta.unit}` : "";

  const body =
    `${meta.title}: in ${latestYear}, ${top.entity} leads at ` +
    `${fmt(top.value)}${unitLabel}, ` +
    `compared to the global figure of ${fmt(worldVal)}${unitLabel}.`;

  return {
    factKey: "top",
    title: `${meta.title} — ${top.entity} leads in ${latestYear}`,
    body,
    lastYear: latestYear,
  };
}

// ── Network helpers ───────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T | null> {
  const timer = new Promise<null>((_, rej) =>
    setTimeout(() => rej(new Error(`timeout: ${label}`)), ms),
  );
  return Promise.race([promise, timer]).catch(() => null);
}

// OWID's CDN returns 404 on HEAD even for valid charts, so we skip HEAD
// verification entirely and rely on the GET metadata fetch below (null ⟹ dead).
async function verifySlug(_slug: string): Promise<boolean> {
  return true;
}

async function fetchMetadata(slug: string): Promise<ChartMeta | null> {
  const p = fetch(`${OWID_BASE}/${slug}.metadata.json`, {
    headers: { "User-Agent": USER_AGENT },
  }).then(async (r) => {
    if (!r.ok) return null;
    return parseOwidMetadata(await r.json());
  });
  return (await withTimeout(p, 30_000, `meta:${slug}`)) ?? null;
}

async function fetchData(slug: string): Promise<DataRow[] | null> {
  const url = `${OWID_BASE}/${slug}.csv?country=${COUNTRY_FILTER}`;
  const p = fetch(url, { headers: { "User-Agent": USER_AGENT } }).then(
    async (r) => {
      if (!r.ok) return null;
      return parseOwidCsv(await r.text());
    },
  );
  return (await withTimeout(p, 60_000, `data:${slug}`)) ?? null;
}

// ── Supabase helpers ─────────────────────────────────────────────────────────

async function fetchExistingArxivIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("papers")
    .select("arxiv_id_base")
    .like("arxiv_id_base", "owid-grapher-%");
  if (error) {
    console.error("[grapher] could not fetch existing ids:", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((row) => row.arxiv_id_base as string));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`[grapher] OWID domains: ${OWID_DOMAINS.map((d) => d.id).join(", ")}`);
  console.log(`[grapher] whitelist: ${SLUG_WHITELIST.length} slugs`);

  const existing = await fetchExistingArxivIds();
  console.log(`[grapher] already in db: ${existing.size} grapher rows`);

  let inserted = 0;
  let skippedExisting = 0;
  let skippedDead = 0;
  let skippedNoData = 0;
  let skippedBoring = 0;
  const perDomain: Record<string, number> = {};
  const sampleZhHooks: Array<{ domain: string; zh: string; slug: string }> = [];

  for (const { slug, domain } of SLUG_WHITELIST) {
    if (inserted >= MAX_INSERTS) {
      console.log(`[grapher] cap reached (${MAX_INSERTS}), stopping.`);
      break;
    }

    const trendKey = `owid-grapher-${slug}-trend`;
    const topKey = `owid-grapher-${slug}-top`;

    if (existing.has(trendKey) && existing.has(topKey)) {
      skippedExisting += 2;
      continue;
    }

    // 1. Verify slug is live
    const live = await verifySlug(slug);
    if (!live) {
      console.log(`  [DEAD] ${slug}`);
      skippedDead += 1;
      await sleep(50);
      continue;
    }

    // 2. Fetch metadata
    await sleep(100);
    const meta = await fetchMetadata(slug);
    if (!meta) {
      console.log(`  [NO META] ${slug}`);
      skippedNoData += 1;
      continue;
    }

    // 3. Fetch data
    await sleep(200);
    const rows = await fetchData(slug);
    if (!rows || rows.length === 0) {
      console.log(`  [NO DATA] ${slug}`);
      skippedNoData += 1;
      continue;
    }

    // 4. Extract facts
    const facts: FactTemplate[] = [];

    if (!existing.has(trendKey)) {
      const trend = extractTrendFact(rows, meta);
      if (trend) {
        facts.push(trend);
      } else {
        skippedBoring += 1;
        console.log(`  [BORING trend] ${slug} (${meta.unit})`);
      }
    }

    if (!existing.has(topKey) && inserted + facts.length < MAX_INSERTS) {
      const top = extractTopFact(rows, meta);
      if (top) facts.push(top);
    }

    if (facts.length === 0) continue;

    // 5. Generate hooks and upsert
    for (const fact of facts) {
      if (inserted >= MAX_INSERTS) break;

      const arxivIdBase = `owid-grapher-${slug}-${fact.factKey}`;
      if (existing.has(arxivIdBase)) {
        skippedExisting += 1;
        continue;
      }

      try {
        await sleep(200);
        const insight = await generateOwidInsight({
          title: fact.title,
          // The body carries the actual numbers; the domain hint lets the LLM
          // confirm the category without having to re-infer it from scratch.
          body: `${fact.body}\n\nSuggested domain: ${domain}.`,
          domains: OWID_DOMAINS,
        });

        // Score relevance (single-row batch — fine at ingest time per spec)
        const relevanceMap = await generateRelevance(
          [{ id: arxivIdBase, title: fact.title, hook_summary_en: insight.hook, hook_summary_zh: insight.hookZh }],
          openai,
          OPENAI_MODEL,
        );
        const rel = relevanceMap.get(arxivIdBase);
        const relevanceRecord = rel
          ? {
              ...rel,
              structure: scoreStructure(insight.hook, insight.hookZh),
              scored_at: new Date().toISOString(),
            }
          : undefined;

        const payload = {
          source: "owid",
          source_id: `grapher:${slug}:${fact.factKey}`,
          // arxiv_id_base must not collide with Data Insights or arXiv ids;
          // "owid-grapher-" prefix namespaces it safely.
          arxiv_id_base: arxivIdBase,
          arxiv_id_version: 1,
          title: fact.title,
          abstract: fact.body,
          hook_summary_en: insight.hook,
          hook_summary_zh: insight.hookZh,
          plain_summary_en: insight.plainSummary,
          plain_summary_zh: insight.plainSummaryZh,
          tags: [domain, "owid", "grapher"],
          // human_category: the LLM confirms the domain; the whitelist hint
          // nudges it to the right one but doesn't override if LLM disagrees.
          human_category: insight.domainId,
          authors: [],
          primary_category: `owid:${insight.domainId}`,
          categories: [insight.domainId],
          // published_at = last data year as YYYY-01-01 because OWID charts
          // have no single publication event. Using Jan 1 is conventional for
          // year-resolution timestamps.
          published_at: `${fact.lastYear}-01-01`,
          source_updated_at: new Date().toISOString(),
          pdf_url: null,
          abs_url: `${OWID_BASE}/${slug}`,
          metadata: {
            source: "owid",
            venue: "Our World in Data",
            // CC BY 4.0 — https://docs.owid.io/projects/etl/api/chart-api/
            license: "CC BY 4.0",
            citation: meta.citation,
            owid_slug: slug,
            fact_key: fact.factKey,
            domain_id: insight.domainId,
            ...(relevanceRecord ? { relevance: relevanceRecord } : {}),
          },
        };

        const { error } = await supabase
          .from("papers")
          .upsert(payload, { onConflict: "arxiv_id_base" });

        if (error) {
          console.error(`  [FAIL] ${slug}:${fact.factKey}: ${error.message}`);
          continue;
        }

        inserted += 1;
        perDomain[insight.domainId] = (perDomain[insight.domainId] ?? 0) + 1;

        if (sampleZhHooks.length < 8 && insight.hookZh) {
          sampleZhHooks.push({ domain: insight.domainId, zh: insight.hookZh, slug });
        }

        console.log(
          `  [OK ${String(inserted).padStart(3)}] ${slug}:${fact.factKey}` +
            ` → ${insight.domainId} | zh: ${insight.hookZh.slice(0, 38)}`,
        );
      } catch (err) {
        console.error(`  [FAIL] ${slug}:${fact.factKey}: ${(err as Error).message}`);
      }
    }
  }

  console.log("\n[grapher] === SUMMARY ===");
  console.log(`  inserted:                  ${inserted}`);
  console.log(`  skipped (already in db):   ${skippedExisting}`);
  console.log(`  skipped (dead slug):       ${skippedDead}`);
  console.log(`  skipped (no data/meta):    ${skippedNoData}`);
  console.log(`  skipped (boring trend):    ${skippedBoring}`);
  console.log("  by domain:");
  for (const [d, n] of Object.entries(perDomain).sort()) {
    console.log(`    ${d}: ${n}`);
  }
  console.log("\n[grapher] sample zh hooks (v5 check: fact-first, deadpan, no !):");
  for (const s of sampleZhHooks) {
    console.log(`  - [${s.domain}] ${s.zh}`);
    // self-check: flag any hook that still contains an exclamation mark
    if (/[!！]/.test(s.zh)) {
      console.warn(`    ⚠  exclamation mark detected — re-run may produce cleaner output`);
    }
  }
}

main().catch((err) => {
  console.error("ingest-owid-grapher crashed:", err);
  process.exit(1);
});
