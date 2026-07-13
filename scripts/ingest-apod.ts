/**
 * NASA APOD ingest — daily astronomical fact pipeline for the space domain.
 *
 * COPYRIGHT RULE (hard — never remove this comment):
 *   The APOD explanation text is an authored work.
 *   NEVER copy or translate its sentences into stored fields.
 *   The LLM prompt must say: extract the single most surprising VERIFIABLE FACT
 *   from this text and restate it in your own words (zh + en, hook rules v5,
 *   no exclamation marks, numbers first, ≤50 zh chars).
 *   If no standalone verifiable fact exists separate from the media being the
 *   story, return null → skip the row.
 *
 * Do NOT store or hotlink APOD images (some are individually copyrighted).
 *
 * Rows: source='apod', source_id=date (YYYY-MM-DD),
 *       arxiv_id_base='apod-'+date, human_category='space',
 *       abs_url=https://apod.nasa.gov/apod/apYYMMDD.html,
 *       metadata.venue='NASA APOD'.
 *
 * Usage:
 *   npx tsx scripts/ingest-apod.ts                    # rolling DAILY_LOOKBACK_DAYS window
 *   npx tsx scripts/ingest-apod.ts --backfill         # last 14 days
 *   npx tsx scripts/ingest-apod.ts --date=2026-06-15  # specific date
 */

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: true, quiet: true });
loadDotenv({ path: ".env", override: false, quiet: true });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { generateRelevance, scoreStructure } from "../src/lib/relevance";
import { rollingLookbackWindow } from "../src/lib/ingest-window";

// ── env ──────────────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const NASA_API_KEY = process.env.NASA_API_KEY ?? "DEMO_KEY";
const OPENAI_MODEL = process.env.OPENAI_MODEL_LOW_COST || "gpt-4o-mini";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Daily-mode rescan window — see the "Daily run" comment in main() for why
// this isn't just "today".
const DAILY_LOOKBACK_DAYS = 3;

// ── META_HOOK_PATTERN — mirrors src/lib/llm.ts ───────────────────────────────
const META_HOOK_PATTERN =
  /这个新?(方法|技术|模型|模拟器|系统|研究)|^一[种个][^，。]{0,10}(方法|技术|模型|系统|工具|拍卖|模拟器|算法)|该研究|这项(研究|技术)|真吓人|太(神奇|可怕|疯狂)了|惊呆|绝了|[!！]\s*$|[—―–]|this (new )?(method|model|approach|technique|study|simulator|system)|the (researchers|study|paper)|(terrifying|mind-blowing|amazing)[.!]?\s*$/i;

// ── types ─────────────────────────────────────────────────────────────────────

type ApodEntry = {
  date: string;
  title: string;
  explanation: string;
  media_type: "image" | "video" | string;
  url: string;
  hdurl?: string;
  copyright?: string;
  service_version?: string;
};

type ApodInsight = {
  hook: string;
  hookZh: string;
  plainSummary: string;
  plainSummaryZh: string;
} | null;

// ── helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeHook(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= 100) return trimmed;
  return `${trimmed.slice(0, 97).trimEnd().replace(/[,.!?;:]+$/, "")}.`;
}

/**
 * Build the abs_url in the format https://apod.nasa.gov/apod/apYYMMDD.html
 * date is "YYYY-MM-DD"
 */
function apodAbsUrl(date: string): string {
  const [year, month, day] = date.split("-");
  const yy = (year ?? "").slice(2);
  return `https://apod.nasa.gov/apod/ap${yy}${month}${day}.html`;
}

/** Return an array of YYYY-MM-DD strings for the last N days (including today). */
function lastNDays(n: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

async function fetchExistingDates(dates: string[]): Promise<Set<string>> {
  if (dates.length === 0) return new Set();
  const { data } = await supabase
    .from("papers")
    .select("source_id")
    .eq("source", "apod")
    .in("source_id", dates);
  return new Set((data ?? []).map((row) => row.source_id as string));
}

// ── NASA APOD fetch ───────────────────────────────────────────────────────────

const NASA_BASE = "https://api.nasa.gov/planetary/apod";

async function fetchApodRange(startDate: string, endDate: string): Promise<ApodEntry[]> {
  const url = `${NASA_BASE}?api_key=${NASA_API_KEY}&start_date=${startDate}&end_date=${endDate}&thumbs=false`;
  const res = await fetch(url, {
    headers: { "User-Agent": "OhloIngest/1.0 (github.com/Barryyep/knowtok)" },
  });
  if (!res.ok) {
    throw new Error(`NASA APOD HTTP ${res.status} for range ${startDate}–${endDate}`);
  }
  const data = await res.json() as ApodEntry | ApodEntry[];
  return Array.isArray(data) ? data : [data];
}

async function fetchApodDate(date: string): Promise<ApodEntry[]> {
  const url = `${NASA_BASE}?api_key=${NASA_API_KEY}&date=${date}&thumbs=false`;
  const res = await fetch(url, {
    headers: { "User-Agent": "OhloIngest/1.0 (github.com/Barryyep/knowtok)" },
  });
  if (!res.ok) {
    throw new Error(`NASA APOD HTTP ${res.status} for date ${date}`);
  }
  const data = await res.json() as ApodEntry | ApodEntry[];
  return Array.isArray(data) ? data : [data];
}

// ── LLM: extract one verifiable fact from APOD explanation ───────────────────
//
// COPYRIGHT RULE ENFORCED HERE:
//   The prompt explicitly forbids copying or translating the explanation text.
//   The model must restate the fact in its own words.

async function generateApodInsight(entry: ApodEntry): Promise<ApodInsight> {
  const prompt = [
    "You are processing a NASA APOD entry for a general-audience fact feed.",
    "",
    "COPYRIGHT RULE: The explanation text below is an authored work. You MUST NOT",
    "copy, quote, or translate any of its sentences. You must extract the single most",
    "surprising VERIFIABLE FACT from the text and restate it entirely in your own words.",
    "",
    "Instructions:",
    '1) "hook": ONE verifiable fact restated in your own words. Plain English, ≤100',
    "   characters. State the FACT ITSELF — a specific number, distance, age, mass,",
    "   or comparison. No exclamation marks. No em-dash or en-dash (— or –); use a comma instead.",
    "   No template openers (Did you know / Scientists found / New research). Deadpan. End with a period.",
    '2) "hookZh": Same fact in Chinese, ≤40 characters. Numbers first where possible.',
    "   No exclamation marks. No dashes (——、—、―); use comma instead. Deadpan. End with a period (句号).",
    "   No meta-description of the image or article (禁止描述图片或文章).",
    '3) "plainSummary": 2-3 sentence plain-English explanation for a 14-year-old.',
    '4) "plainSummaryZh": Same in Chinese, 2-3 sentences.',
    "",
    "SKIP RULE: If the APOD entry is purely about a specific image/artwork and the",
    "explanation contains NO standalone verifiable fact (no number, no measurable",
    "property, no named event with a date), return:",
    '{"skip": true}',
    "",
    "DOMAIN RULE: The fact must be about astronomy, space, or atmospheric optics.",
    "If the only extractable fact is about buildings, cities, people, or other",
    "ground subjects that happen to appear in the photo (e.g. a skyline tower's",
    'height), return {"skip": true} — this feed files every APOD row under the',
    "space domain, so an off-domain fact corrupts personalization.",
    "",
    "APOD title: " + entry.title,
    "APOD explanation (source text — do NOT copy):",
    entry.explanation,
    "",
    'Return strict JSON: {"hook":"...","hookZh":"...","plainSummary":"...","plainSummaryZh":"..."}',
    'OR if no standalone fact: {"skip": true}',
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
            "You extract verifiable facts from astronomy text and restate them in your own words. Output JSON only.",
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

  const hook = normalizeHook(first.hook ?? entry.title);
  const hookZh = first.hookZh?.trim() ?? "";

  // Retry guard — mirrors META_HOOK_PATTERN logic in src/lib/llm.ts
  if (META_HOOK_PATTERN.test(hookZh) || META_HOOK_PATTERN.test(hook)) {
    const second = await tryOnce();
    if (second.skip) return null;
    const h2 = normalizeHook(second.hook ?? entry.title);
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

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const backfill = args.includes("--backfill");
  const dateArg = args.find((a) => a.startsWith("--date="))?.slice(7);

  const today = new Date().toISOString().slice(0, 10);

  let entries: ApodEntry[] = [];

  if (backfill) {
    // 14-day backfill using NASA's start_date/end_date range endpoint
    const end = today;
    const startD = new Date();
    startD.setDate(startD.getDate() - 13);
    const start = startD.toISOString().slice(0, 10);
    console.log(`[apod] backfill mode: fetching ${start} → ${end}`);
    entries = await fetchApodRange(start, end);
  } else if (dateArg) {
    console.log(`[apod] single date: ${dateArg}`);
    entries = await fetchApodDate(dateArg);
  } else {
    // Daily run: a rolling window, not just today. The cron fires at 06:00
    // Asia/Shanghai (22:00 UTC) — NASA's "today" entry doesn't always exist
    // yet at that moment relative to US Eastern time, and a bare fetch
    // failure here used to crash the whole step with no retry. Re-scanning
    // the last few days is free (fetchExistingDates is idempotent on date),
    // so a day that wasn't published yet at run time gets picked up on the
    // next run instead of being silently lost forever.
    const { startDate: start, endDate: end } = rollingLookbackWindow(new Date(), DAILY_LOOKBACK_DAYS);
    console.log(`[apod] daily mode: fetching ${start} → ${end}`);
    entries = await fetchApodRange(start, end);
  }

  console.log(`[apod] fetched ${entries.length} entries`);

  // Pre-flight skip check using existing source_ids
  const dates = entries.map((e) => e.date).filter(Boolean);
  const existing = await fetchExistingDates(dates);

  let inserted = 0;
  let skipped = 0;
  let nullFact = 0;
  const perDomain: Record<string, number> = { space: 0 };
  const sampleZhHooks: string[] = [];

  for (const entry of entries) {
    if (!entry.date || !entry.title || !entry.explanation) {
      console.warn(`  [SKIP] missing fields for entry: ${JSON.stringify(entry).slice(0, 80)}`);
      continue;
    }
    if (existing.has(entry.date)) {
      skipped += 1;
      continue;
    }
    if (entry.explanation.length < 80) {
      console.warn(`  [SKIP] explanation too short: ${entry.date}`);
      continue;
    }

    try {
      const insight = await generateApodInsight(entry);
      if (!insight) {
        nullFact += 1;
        console.log(`  [NULL] ${entry.date}: no standalone verifiable fact — skipped`);
        continue;
      }

      const absUrl = apodAbsUrl(entry.date);
      const apodId = `apod-${entry.date}`;

      // Score relevance — APOD source defaults to "recent" timeliness
      const relevanceMap = await generateRelevance(
        [{ id: apodId, title: entry.title, hook_summary_en: insight.hook, hook_summary_zh: insight.hookZh }],
        openai,
        OPENAI_MODEL,
        { timelinessHint: "recent" },
      );
      const rel = relevanceMap.get(apodId);
      const relevanceRecord = rel
        ? {
            ...rel,
            structure: scoreStructure(insight.hook, insight.hookZh),
            scored_at: new Date().toISOString(),
          }
        : undefined;

      const payload = {
        source: "apod",
        source_id: entry.date,
        arxiv_id_base: apodId,
        arxiv_id_version: 1,
        title: entry.title,
        // We store the raw explanation only so it can inform future reprocessing.
        // It is NOT displayed in the app — the hook fields are what users see.
        abstract: entry.explanation,
        hook_summary_en: insight.hook,
        hook_summary_zh: insight.hookZh,
        plain_summary_en: insight.plainSummary,
        plain_summary_zh: insight.plainSummaryZh,
        tags: [],
        human_category: "space",
        authors: [],
        primary_category: "apod:space",
        categories: ["space"],
        published_at: new Date(entry.date).toISOString(),
        source_updated_at: new Date(entry.date).toISOString(),
        pdf_url: null,
        // COPYRIGHT: we do NOT store or hotlink the APOD image URL here.
        abs_url: absUrl,
        metadata: {
          source: "apod",
          venue: "NASA APOD",
          // Copyright notice stored for front-end attribution when present.
          ...(entry.copyright ? { copyrightNotice: entry.copyright.trim() } : {}),
          media_type: entry.media_type,
          ...(relevanceRecord ? { relevance: relevanceRecord } : {}),
        },
      };

      const { error } = await supabase
        .from("papers")
        .upsert(payload, { onConflict: "arxiv_id_base" });

      if (error) {
        console.error(`  [FAIL] ${entry.date}: ${error.message}`);
        continue;
      }

      inserted += 1;
      perDomain["space"] = (perDomain["space"] ?? 0) + 1;
      if (sampleZhHooks.length < 5 && insight.hookZh) {
        sampleZhHooks.push(`[space] ${insight.hookZh}`);
      }
      console.log(
        `  [OK ${inserted}] ${entry.date}: ${insight.hookZh.slice(0, 35)}`
      );
      await sleep(150);
    } catch (err) {
      console.error(`  [FAIL] ${entry.date}: ${(err as Error).message}`);
    }
  }

  console.log("\n[apod] === SUMMARY ===");
  console.log(`  inserted: ${inserted}`);
  console.log(`  skipped (already present): ${skipped}`);
  console.log(`  skipped (no standalone fact): ${nullFact}`);
  console.log("  by domain:");
  for (const [d, n] of Object.entries(perDomain)) console.log(`    ${d}: ${n}`);
  console.log("\n[apod] sample zh hooks:");
  for (const h of sampleZhHooks) console.log(`  - ${h}`);
}

main().catch((err) => {
  console.error("ingest-apod crashed:", err);
  process.exit(1);
});
