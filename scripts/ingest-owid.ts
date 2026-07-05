/**
 * OWID ingest — the new backbone for the consumer domains.
 *
 * Our World in Data's "Data Insights" Atom feed is a stream of ready-made,
 * single-fact, layperson-comprehensible, CC-BY-licensed posts, each backed by
 * a real linkable chart. docs/data-sources-v2.md rated it ~85–90% usable and
 * the standout source for health/food/money/climate/nature/mind/society.
 *
 * Pipeline:
 *   Atom feed (XML) → parse each entry (title/body/link/date) → strip the body
 *   HTML to plain text → generateOwidInsight (same OpenAI env/model, same hook
 *   style rules as the paper generator) assigns ONE taxonomy DOMAIN id + writes
 *   bilingual hooks/summaries → upsert into `papers` with source='owid'.
 *
 * Idempotent by (source, source_id) — source_id is the insight slug.
 *
 * Usage:
 *   npx tsx scripts/ingest-owid.ts
 */

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: true, quiet: true });
loadDotenv({ path: ".env", override: false, quiet: true });

import { XMLParser } from "fast-xml-parser";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { generateOwidInsight } from "../src/lib/llm";
import { DOMAINS } from "../mobile/src/lib/taxonomy";
import { generateRelevance, scoreStructure } from "../src/lib/relevance";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL_LOW_COST ?? "gpt-4o-mini";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const OWID_FEED = "https://ourworldindata.org/atom-data-insights.xml";

// The OWID-capable domains, straight from the frozen taxonomy — the single
// source of truth. Only these are offered to the classifier.
const OWID_DOMAINS = DOMAINS.filter((d) => d.sources.includes("owid")).map((d) => ({
  id: d.id,
  zh: d.zh,
  en: d.en,
}));

type AtomEntry = {
  title?: string;
  id?: string;
  link?: { href?: string } | Array<{ href?: string }>;
  published?: string;
  updated?: string;
  content?: string | { "#text"?: string };
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Strip HTML tags/entities from OWID content HTML into a plain-text body. */
function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

/** "https://ourworldindata.org/data-insights/tobacco-use-in-india" → "tobacco-use-in-india" */
function slugFromUrl(url: string): string {
  return (url.split("?")[0].replace(/\/+$/, "").split("/").pop() || url).trim();
}

function entryUrl(entry: AtomEntry): string {
  if (Array.isArray(entry.link)) {
    return entry.link.find((l) => l.href)?.href || entry.id || "";
  }
  return entry.link?.href || entry.id || "";
}

function entryContent(entry: AtomEntry): string {
  if (typeof entry.content === "string") return entry.content;
  return entry.content?.["#text"] || "";
}

function isoDate(d: string | undefined): string {
  if (!d) return new Date().toISOString();
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

async function fetchExistingSourceIds(sourceIds: string[]): Promise<Set<string>> {
  if (sourceIds.length === 0) return new Set();
  const { data } = await supabase
    .from("papers")
    .select("source_id")
    .eq("source", "owid")
    .in("source_id", sourceIds);
  return new Set((data ?? []).map((row) => row.source_id as string));
}

async function fetchFeed(): Promise<AtomEntry[]> {
  const res = await fetch(OWID_FEED, {
    headers: { "User-Agent": "Ohlo/0.1 (https://ohlo.app; contact: hello@ohlo.app)" },
  });
  if (!res.ok) throw new Error(`OWID feed HTTP ${res.status}`);
  const xml = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    // CDATA content is preserved as node text by default.
  });
  const parsed = parser.parse(xml) as { feed?: { entry?: AtomEntry | AtomEntry[] } };
  const entries = parsed.feed?.entry;
  if (!entries) return [];
  return Array.isArray(entries) ? entries : [entries];
}

async function main() {
  console.log(`[owid] domains: ${OWID_DOMAINS.map((d) => d.id).join(", ")}`);

  let entries: AtomEntry[];
  try {
    entries = await fetchFeed();
  } catch (err) {
    console.error(`[owid] feed fetch failed: ${(err as Error).message}`);
    process.exit(1);
  }
  console.log(`[owid] fetched ${entries.length} feed entries`);

  const slugs = entries.map((e) => slugFromUrl(entryUrl(e))).filter(Boolean);
  const existing = await fetchExistingSourceIds(slugs);

  let inserted = 0;
  let skipped = 0;
  const perDomain: Record<string, number> = {};
  const sampleZhHooks: string[] = [];

  for (const entry of entries) {
    const url = entryUrl(entry);
    const slug = slugFromUrl(url);
    const title = (typeof entry.title === "string" ? entry.title : "").trim();
    const body = htmlToText(entryContent(entry));

    if (!slug || !title) {
      console.warn(`  [SKIP] missing slug/title for ${url}`);
      continue;
    }
    if (existing.has(slug)) {
      skipped += 1;
      continue;
    }
    if (body.length < 80) {
      console.warn(`  [SKIP] body too short: ${slug}`);
      continue;
    }

    try {
      const insight = await generateOwidInsight({ title, body, domains: OWID_DOMAINS });

      // Score relevance (single-row batch — fine at ingest time per spec)
      const relevanceMap = await generateRelevance(
        [{ id: slug, title, hook_summary_en: insight.hook, hook_summary_zh: insight.hookZh }],
        openai,
        OPENAI_MODEL,
      );
      const rel = relevanceMap.get(slug);
      const relevanceRecord = rel
        ? {
            ...rel,
            structure: scoreStructure(insight.hook, insight.hookZh),
            scored_at: new Date().toISOString(),
          }
        : undefined;

      const payload = {
        source: "owid",
        source_id: slug,
        // arxiv_id_base is NOT NULL + globally unique — namespace the slug so it
        // never collides with an arXiv or OpenAlex id.
        arxiv_id_base: `owid-${slug}`,
        arxiv_id_version: 1,
        title,
        abstract: body,
        hook_summary_en: insight.hook,
        hook_summary_zh: insight.hookZh,
        plain_summary_en: insight.plainSummary,
        plain_summary_zh: insight.plainSummaryZh,
        tags: [],
        // OWID rows store a taxonomy DOMAIN id here (the agreed convention),
        // whereas arXiv rows store a legacy category label.
        human_category: insight.domainId,
        authors: [],
        primary_category: `owid:${insight.domainId}`,
        categories: [insight.domainId],
        published_at: isoDate(entry.published || entry.updated),
        source_updated_at: isoDate(entry.updated || entry.published),
        pdf_url: null,
        abs_url: url,
        metadata: {
          source: "owid",
          venue: "Our World in Data",
          owid_slug: slug,
          domain_id: insight.domainId,
          ...(relevanceRecord ? { relevance: relevanceRecord } : {}),
        },
      };

      const { error } = await supabase
        .from("papers")
        .upsert(payload, { onConflict: "arxiv_id_base" });
      if (error) {
        console.error(`  [FAIL] ${slug}: ${error.message}`);
        continue;
      }

      inserted += 1;
      perDomain[insight.domainId] = (perDomain[insight.domainId] ?? 0) + 1;
      if (sampleZhHooks.length < 5 && insight.hookZh) {
        sampleZhHooks.push(`[${insight.domainId}] ${insight.hookZh}`);
      }
      console.log(`  [OK ${inserted}] ${slug} → ${insight.domainId} | zh: ${insight.hookZh.slice(0, 30)}`);
      await sleep(150); // gentle on the OpenAI endpoint
    } catch (err) {
      console.error(`  [FAIL] ${slug}: ${(err as Error).message}`);
    }
  }

  console.log("\n[owid] === SUMMARY ===");
  console.log(`  inserted: ${inserted}`);
  console.log(`  skipped (already present): ${skipped}`);
  console.log("  by domain:");
  for (const [d, n] of Object.entries(perDomain)) console.log(`    ${d}: ${n}`);
  console.log("\n[owid] sample zh hooks:");
  for (const h of sampleZhHooks) console.log(`  - ${h}`);
}

main().catch((err) => {
  console.error("ingest-owid crashed:", err);
  process.exit(1);
});
