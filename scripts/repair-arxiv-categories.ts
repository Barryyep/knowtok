/**
 * repair-arxiv-categories.ts
 *
 * Deterministic repair of papers.human_category for arxiv/null-source rows.
 * The LLM "category sanity pass" in backfill-paper-metadata.ts corrupted
 * human_category across 3 runs (incident 2026-07-04).
 *
 * Strategy: reapply categoryFromPrefix() from src/lib/llm.ts — the original
 * ingest's deterministic mapping — to every arxiv row.  Only writes rows
 * whose current value differs.  Safe to rerun (idempotent).
 *
 * Usage:
 *   npx tsx scripts/repair-arxiv-categories.ts
 *   npx tsx scripts/repair-arxiv-categories.ts --dry-run
 */

import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local", override: true, quiet: true });
loadDotenv({ path: ".env", override: false, quiet: true });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DRY_RUN = process.argv.includes("--dry-run");

// ─── Canonical mapping (verbatim from src/lib/llm.ts categoryFromPrefix) ────
// Source: /Users/barry/Desktop/project/knowtok/src/lib/llm.ts lines 89-95
function categoryFromPrefix(primaryCategory: string): string {
  if (primaryCategory.startsWith("cs.")) return "AI & Robots";
  if (primaryCategory.startsWith("q-bio.")) return "Your Health";
  if (primaryCategory.startsWith("q-fin.") || primaryCategory.startsWith("econ.")) return "Your Money";
  if (primaryCategory.startsWith("physics.ao-ph") || primaryCategory.startsWith("physics.geo-ph") || primaryCategory.startsWith("astro-ph.EP")) return "Climate";
  return "AI & Robots"; // fallback
}

// Domains the ingest script actually targets (from src/lib/ingest.ts DOMAINS).
// A paper whose primary_category root is NOT in this list was never directly
// targeted; it may have arrived via arXiv cross-listing. These are "orphans."
const INGEST_DOMAINS = new Set(["cs", "physics", "math", "q-bio", "q-fin", "econ", "astro-ph"]);

function primaryDomainRoot(primaryCategory: string): string {
  return primaryCategory.split(".")[0] ?? primaryCategory;
}

function isOrphan(primaryCategory: string): boolean {
  return !INGEST_DOMAINS.has(primaryDomainRoot(primaryCategory));
}

interface PaperRow {
  id: string;
  title: string;
  primary_category: string | null;
  human_category: string | null;
}

async function fetchAllArxivRows(): Promise<PaperRow[]> {
  const all: PaperRow[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("papers")
      .select("id, title, primary_category, human_category")
      .or("source.eq.arxiv,source.is.null")
      .order("published_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`fetch failed: ${error.message}`);
    all.push(...((data ?? []) as PaperRow[]));
    if ((data ?? []).length < pageSize) break;
  }
  return all;
}

async function main() {
  console.log(`[repair-arxiv-categories] ${DRY_RUN ? "DRY RUN — no writes" : "LIVE RUN"}`);

  const rows = await fetchAllArxivRows();
  console.log(`Total arxiv/null rows: ${rows.length}`);

  // ─── Compute corrections ───────────────────────────────────────────────────
  const toUpdate: Array<{ id: string; title: string; from: string | null; to: string; orphan: boolean }> = [];
  const nullCategory: string[] = [];
  const orphans: Array<{ id: string; title: string; primary_category: string; assigned: string }> = [];

  for (const row of rows) {
    const primary = row.primary_category ?? "";
    const correct = categoryFromPrefix(primary);

    if (isOrphan(primary)) {
      orphans.push({ id: row.id, title: row.title, primary_category: primary, assigned: correct });
    }

    if (!row.human_category) {
      nullCategory.push(row.id);
    }

    if (row.human_category !== correct) {
      toUpdate.push({ id: row.id, title: row.title, from: row.human_category, to: correct, orphan: isOrphan(primary) });
    }
  }

  console.log(`Rows needing correction: ${toUpdate.length}`);
  console.log(`Orphan rows (primary domain not in ingest DOMAINS): ${orphans.length}`);
  console.log(`Rows with null/missing human_category: ${nullCategory.length}`);

  if (toUpdate.length === 0) {
    console.log("\n✓ 0 changes — database already consistent. Script is idempotent.");
  }

  // ─── Apply corrections ─────────────────────────────────────────────────────
  let updated = 0;
  let failed = 0;

  for (const fix of toUpdate) {
    if (DRY_RUN) {
      console.log(
        `  [DRY] ${fix.id} | "${fix.title.slice(0, 60)}" | "${fix.from}" → "${fix.to}"${fix.orphan ? " [orphan]" : ""}`,
      );
      updated++;
      continue;
    }

    const { error } = await supabase
      .from("papers")
      .update({ human_category: fix.to })
      .eq("id", fix.id);

    if (error) {
      console.error(`  [FAIL] ${fix.id}: ${error.message}`);
      failed++;
    } else {
      console.log(
        `  [FIX] ${fix.id} | "${fix.title.slice(0, 60)}" | "${fix.from}" → "${fix.to}"${fix.orphan ? " [orphan]" : ""}`,
      );
      updated++;
    }
  }

  if (!DRY_RUN) {
    console.log(`\nUpdated: ${updated}, Failed: ${failed}`);
  }

  // ─── Post-repair distribution ──────────────────────────────────────────────
  console.log("\n=== Post-repair distribution ===");
  const freshRows = await fetchAllArxivRows();
  const dist: Record<string, number> = {};
  let nullCount = 0;
  for (const r of freshRows) {
    const cat = r.human_category ?? "(null)";
    dist[cat] = (dist[cat] ?? 0) + 1;
    if (!r.human_category) nullCount++;
  }
  console.log(JSON.stringify(dist, null, 2));
  console.log(`Total: ${freshRows.length}`);
  console.log(`Null human_category: ${nullCount}`);

  // ─── Idempotency check ─────────────────────────────────────────────────────
  let remaining = 0;
  for (const r of freshRows) {
    const primary = r.primary_category ?? "";
    const correct = categoryFromPrefix(primary);
    if (r.human_category !== correct) remaining++;
  }
  console.log(`\nIdempotency check — rows still differing: ${remaining} (should be 0)`);

  // ─── 12 random sample pairs ────────────────────────────────────────────────
  console.log("\n=== 12 random (category, title) samples ===");
  const shuffled = [...freshRows].sort(() => Math.random() - 0.5).slice(0, 12);
  for (const r of shuffled) {
    console.log(`  [${r.human_category}] "${r.title.slice(0, 80)}"`);
  }

  // ─── Orphan report ─────────────────────────────────────────────────────────
  console.log(`\n=== Orphan rows (${orphans.length} total) — 5 examples ===`);
  for (const o of orphans.slice(0, 5)) {
    console.log(`  ${o.id} | primary=${o.primary_category} | assigned=${o.assigned} | "${o.title.slice(0, 70)}"`);
  }
  console.log("(Orphans assigned AI & Robots fallback. Candidates for deletion — NOT deleted.)");

  // ─── Final status ──────────────────────────────────────────────────────────
  console.log("\n=== FINAL STATUS ===");
  console.log(`Rows changed: ${DRY_RUN ? `${updated} (dry run)` : updated}`);
  console.log(`Rows failed:  ${failed}`);
  console.log(`Null human_category remaining: ${nullCount}`);
  console.log(`Idempotency (0 = pass): ${remaining}`);
  console.log(`Status: ${nullCount === 0 && remaining === 0 ? "PASS ✓" : "FAIL ✗"}`);
}

main().catch((err) => {
  console.error("repair-arxiv-categories crashed:", err);
  process.exitCode = 1;
});
