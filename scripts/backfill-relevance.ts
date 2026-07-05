/**
 * backfill-relevance.ts — algorithm-v1 A1 backfill
 *
 * Sweeps ALL papers rows lacking metadata.relevance, batch-generates relevance
 * metadata via the shared scorer (src/lib/relevance.ts), and writes:
 *
 *   metadata.relevance = {
 *     contexts, utility, timeliness, hook_strength,  ← LLM raw components
 *     structure,                                      ← regex raw component
 *     scored_at,                                      ← ISO timestamp
 *   }
 *
 * Idempotent: rows already having metadata.relevance are skipped.
 * Concurrency: ≤3 batches in flight simultaneously.
 * Batch size: 20 rows per LLM call.
 *
 * Usage:
 *   npx tsx scripts/backfill-relevance.ts
 */

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: true, quiet: true });
loadDotenv({ path: ".env", override: false, quiet: true });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import {
  generateRelevance,
  scoreStructure,
  FALLBACK_RELEVANCE,
  type RelevanceRecord,
} from "../src/lib/relevance";

// ── Env ───────────────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL =
  process.env.OPENAI_MODEL_LOW_COST ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const BATCH_SIZE = 20;
const CONCURRENCY = 3;

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaperRow {
  id: string;
  title: string;
  hook_summary_en: string | null;
  hook_summary_zh: string | null;
  source: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any> | null;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchAllPapers(): Promise<PaperRow[]> {
  const all: PaperRow[] = [];
  const pageSize = 500;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("papers")
      .select("id, title, hook_summary_en, hook_summary_zh, source, metadata")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`papers query failed: ${error.message}`);
    const rows = (data ?? []) as PaperRow[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }

  return all;
}

// ── concurrency helper ────────────────────────────────────────────────────────

async function pMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );
  return results;
}

// ── per-source timeliness hint ────────────────────────────────────────────────

function timeslinessHintForSource(
  source: string | null,
): "evergreen" | "recent" | "breaking" | undefined {
  if (source === "wikidata") return "evergreen";
  if (source === "apod") return "recent";
  return undefined;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[backfill-relevance] model=${MODEL}`);

  // ── Fetch all rows ─────────────────────────────────────────────────────────
  console.log("\n[1] Fetching all papers rows...");
  const allRows = await fetchAllPapers();
  console.log(`  total rows: ${allRows.length}`);

  // ── Filter to unscored rows ────────────────────────────────────────────────
  const toScore = allRows.filter((row) => !row.metadata?.relevance);
  const alreadyScored = allRows.length - toScore.length;

  console.log(`  already scored: ${alreadyScored}`);
  console.log(`  to score: ${toScore.length}`);

  if (toScore.length === 0) {
    console.log("\n[backfill-relevance] Nothing to do — all rows already scored.");
    console.log("\n=== SUMMARY ===");
    console.log(`  total rows:      ${allRows.length}`);
    console.log(`  already scored:  ${alreadyScored}`);
    console.log(`  newly scored:    0`);
    console.log(`  failed:          0`);
    return;
  }

  // ── Per-source stats setup ─────────────────────────────────────────────────
  const perSource: Record<string, { scored: number; failed: number }> = {};

  // ── Build batches ─────────────────────────────────────────────────────────
  const batches: PaperRow[][] = [];
  for (let i = 0; i < toScore.length; i += BATCH_SIZE) {
    batches.push(toScore.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `\n[2] Scoring ${toScore.length} rows in ${batches.length} batch(es) (concurrency=${CONCURRENCY})...`,
  );

  let totalScored = 0;
  let totalFailed = 0;
  const samples: Array<{ id: string; source: string | null; relevance: RelevanceRecord }> = [];

  // Process batches with concurrency limit
  await pMap(
    batches,
    async (batch, batchIdx) => {
      const label = `[batch ${batchIdx + 1}/${batches.length}]`;

      // Determine timeliness hint: if all rows in batch are same source, use it
      const sources = [...new Set(batch.map((r) => r.source))];
      const hint =
        sources.length === 1 ? timeslinessHintForSource(sources[0] ?? null) : undefined;

      let relevanceMap: Map<string, { contexts: ("professional" | "student" | "homemaker" | "parent")[]; utility: "conversation" | "decision" | "self"; timeliness: "evergreen" | "recent" | "breaking"; hook_strength: number }>;
      try {
        relevanceMap = await generateRelevance(batch, openai, MODEL, hint ? { timelinessHint: hint } : undefined);
      } catch (err) {
        console.error(`  ${label} generateRelevance failed: ${(err as Error).message}`);
        // Fallback for entire batch
        relevanceMap = new Map(
          batch.map((r) => [r.id, { ...FALLBACK_RELEVANCE }]),
        );
      }

      // Write each row
      const writePromises = batch.map(async (row) => {
        const rel = relevanceMap.get(row.id) ?? { ...FALLBACK_RELEVANCE };
        const scoredAt = new Date().toISOString();
        const relevanceRecord: RelevanceRecord = {
          ...rel,
          structure: scoreStructure(row.hook_summary_en, row.hook_summary_zh),
          scored_at: scoredAt,
        };

        // Merge into existing metadata, never clobber other keys
        const existingMeta = (row.metadata ?? {}) as Record<string, unknown>;
        const newMeta = { ...existingMeta, relevance: relevanceRecord };

        const { error } = await supabase
          .from("papers")
          .update({ metadata: newMeta })
          .eq("id", row.id);

        const src = row.source ?? "unknown";
        if (!perSource[src]) perSource[src] = { scored: 0, failed: 0 };

        if (error) {
          console.error(
            `  ${label} [FAIL] id=${row.id} source=${src}: ${error.message}`,
          );
          perSource[src].failed += 1;
          totalFailed += 1;
        } else {
          perSource[src].scored += 1;
          totalScored += 1;
          if (samples.length < 6) {
            samples.push({ id: row.id, source: row.source, relevance: relevanceRecord });
          }
        }
      });

      await Promise.all(writePromises);
      console.log(
        `  ${label} done — scored ${batch.length} rows (running total: ${totalScored} ok / ${totalFailed} fail)`,
      );
    },
    CONCURRENCY,
  );

  // ── Verify idempotency ─────────────────────────────────────────────────────
  console.log("\n[3] Verifying idempotency (re-fetching to confirm 0 unscored)...");
  const freshRows = await fetchAllPapers();
  const stillUnscored = freshRows.filter((row) => !row.metadata?.relevance);
  console.log(
    `  unscored after backfill: ${stillUnscored.length} (expected 0 if no failures)`,
  );

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n=== SUMMARY ===");
  console.log(`  total rows:      ${allRows.length}`);
  console.log(`  already scored:  ${alreadyScored}`);
  console.log(`  newly scored:    ${totalScored}`);
  console.log(`  failed:          ${totalFailed}`);
  console.log(`  unscored after:  ${stillUnscored.length}`);
  console.log("\n  per-source:");
  for (const [src, counts] of Object.entries(perSource)) {
    console.log(`    ${src}: ${counts.scored} scored, ${counts.failed} failed`);
  }

  if (samples.length > 0) {
    console.log("\n=== 6-ROW SAMPLE ===");
    for (const s of samples) {
      console.log(`\n  [${s.id}] source=${s.source}`);
      console.log(`    contexts:      ${JSON.stringify(s.relevance.contexts)}`);
      console.log(`    utility:       ${s.relevance.utility}`);
      console.log(`    timeliness:    ${s.relevance.timeliness}`);
      console.log(`    hook_strength: ${s.relevance.hook_strength}`);
      console.log(`    structure:     ${s.relevance.structure}`);
      console.log(`    scored_at:     ${s.relevance.scored_at}`);
    }
  }

  if (totalFailed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[backfill-relevance] crashed:", err);
  process.exitCode = 1;
});
