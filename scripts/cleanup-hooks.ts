/**
 * cleanup-hooks.ts — one-shot dash cleanup for existing papers rows.
 *
 * 1. Sweeps ALL papers rows:
 *    - hook_summary_zh containing ——/—/― → replace with ，(zh comma),
 *      collapsing any spaces around the dash.
 *    - hook_summary_en containing —/– → replace with ", " (comma+space),
 *      collapsing doubled spaces/commas.
 * 2. Prints each before → after (capped at 40 lines; counts the rest).
 * 3. Reports (does NOT auto-shorten) rows whose hook_summary_zh exceeds
 *    40 chars: count + the 10 longest with lengths.
 * 4. Idempotent: re-running on a clean DB is a no-op (0 updates).
 *
 * Usage: npx tsx scripts/cleanup-hooks.ts
 */

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: true, quiet: true });
loadDotenv({ path: ".env", override: false, quiet: true });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── dash patterns ────────────────────────────────────────────────────────────
/** zh: em dash (—), double em dash (——), horizontal bar (―) */
const ZH_DASH_RE = /\s*[——―—]\s*/g;
/** en: em dash (—), en dash (–) */
const EN_DASH_RE = /\s*[—–]\s*/g;

/** Count Unicode code points (CJK = 1 each). */
function charLen(s: string): number {
  return Array.from(s).length;
}

function cleanZhDashes(s: string): string {
  return s.replace(ZH_DASH_RE, "，").replace(/，，+/g, "，");
}

function cleanEnDashes(s: string): string {
  return s
    .replace(EN_DASH_RE, ", ")
    .replace(/ , /g, ", ")
    .replace(/,{2,}/g, ",")
    .replace(/,\s{2,}/g, ", ");
}

function zhHasDash(s: string): boolean {
  return /[——―—]/.test(s);
}

function enHasDash(s: string): boolean {
  return /[—–]/.test(s);
}

// ─── types ────────────────────────────────────────────────────────────────────
interface PaperRow {
  id: string;
  hook_summary_zh: string | null;
  hook_summary_en: string | null;
}

// ─── Supabase pagination helper ───────────────────────────────────────────────
async function fetchAllPapers(): Promise<PaperRow[]> {
  const all: PaperRow[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("papers")
      .select("id, hook_summary_zh, hook_summary_en")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`papers query failed: ${error.message}`);
    const rows = (data ?? []) as PaperRow[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("[cleanup-hooks] fetching all papers…");
  const papers = await fetchAllPapers();
  console.log(`  Total rows: ${papers.length}`);

  // ─── Pass 1: Dash cleanup ──────────────────────────────────────────────────
  let zhFixed = 0;
  let enFixed = 0;
  let printedLines = 0;
  const MAX_PRINT = 40;

  for (const paper of papers) {
    const origZh = paper.hook_summary_zh ?? "";
    const origEn = paper.hook_summary_en ?? "";

    const newZh = origZh && zhHasDash(origZh) ? cleanZhDashes(origZh) : origZh;
    const newEn = origEn && enHasDash(origEn) ? cleanEnDashes(origEn) : origEn;

    const zhChanged = newZh !== origZh;
    const enChanged = newEn !== origEn;

    if (!zhChanged && !enChanged) continue;

    const update: Record<string, string> = {};
    if (zhChanged) update.hook_summary_zh = newZh;
    if (enChanged) update.hook_summary_en = newEn;

    const { error } = await supabase.from("papers").update(update).eq("id", paper.id);
    if (error) {
      console.error(`  [FAIL] ${paper.id}: ${error.message}`);
      continue;
    }

    if (zhChanged) zhFixed++;
    if (enChanged) enFixed++;

    if (printedLines < MAX_PRINT) {
      if (zhChanged) {
        console.log(`  [ZH] ${paper.id}`);
        console.log(`    BEFORE: ${origZh}`);
        console.log(`    AFTER:  ${newZh}`);
        printedLines++;
      }
      if (enChanged) {
        console.log(`  [EN] ${paper.id}`);
        console.log(`    BEFORE: ${origEn}`);
        console.log(`    AFTER:  ${newEn}`);
        printedLines++;
      }
    } else if (printedLines === MAX_PRINT) {
      console.log(`  … (output capped at ${MAX_PRINT} lines; additional changes suppressed)`);
      printedLines++;
    }
  }

  console.log(`\nDash fixes: zh=${zhFixed}, en=${enFixed}`);

  // ─── Pass 2: Over-40 zh report (no writes) ────────────────────────────────
  // Re-fetch to include the rows we just updated.
  const fresh = await fetchAllPapers();
  const over40 = fresh
    .filter((p) => p.hook_summary_zh && charLen(p.hook_summary_zh) > 40)
    .map((p) => ({ id: p.id, zh: p.hook_summary_zh as string, len: charLen(p.hook_summary_zh as string) }))
    .sort((a, b) => b.len - a.len);

  console.log(`\nOver-40 zh hook report (NOT auto-shortened — needs LLM judgment):`);
  console.log(`  Count: ${over40.length}`);
  if (over40.length > 0) {
    console.log("  Top 10 longest:");
    for (const row of over40.slice(0, 10)) {
      console.log(`    [${row.id}] len=${row.len}: ${row.zh}`);
    }
  }

  // ─── Idempotency check ────────────────────────────────────────────────────
  const remaining = fresh.filter(
    (p) =>
      (p.hook_summary_zh && zhHasDash(p.hook_summary_zh)) ||
      (p.hook_summary_en && enHasDash(p.hook_summary_en)),
  );
  console.log(`\nIdempotency: ${remaining.length} rows still have dashes (should be 0).`);
  if (remaining.length > 0) {
    for (const r of remaining.slice(0, 5)) {
      console.log(`  [REMAIN] ${r.id} zh="${r.hook_summary_zh}" en="${r.hook_summary_en}"`);
    }
  }
}

main().catch((err) => {
  console.error("cleanup-hooks crashed:", err);
  process.exitCode = 1;
});
