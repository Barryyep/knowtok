/**
 * backfill-paper-metadata.ts — v5 quality cleanup
 *
 * Pass 1 — Detection (no LLM): flag all arxiv/null-source rows with v5 violations.
 * Pass 2 — Regeneration: rewrite flagged hooks through the current v5 generation
 *           path with META_HOOK_PATTERN retry (mirrors src/lib/llm.ts).
 * Pass 3 — Category sanity (REPORT-ONLY): LLM-check every arxiv row's
 *           human_category vs title+hook; prints mismatches but NEVER writes.
 *           Category writes must be deterministic via the ingest mapping
 *           (src/lib/llm.ts categoryFromPrefix), never LLM opinion
 *           (incident 2026-07-04: LLM category pass corrupted 86 rows).
 * Pass 4 — Verification: confirm 0 violations and 0 null hooks.
 *
 * Resumable: detection runs first on every invocation; rows already clean are
 * skipped automatically. Concurrency: ≤ CONCURRENCY parallel LLM calls.
 *
 * Usage: npx tsx scripts/backfill-paper-metadata.ts
 */

import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local", override: true, quiet: true });
loadDotenv({ path: ".env", override: false, quiet: true });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

// ─── env ─────────────────────────────────────────────────────────────────────
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL =
  process.env.OPENAI_MODEL_LOW_COST || process.env.OPENAI_MODEL || "gpt-4o-mini";

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

const CONCURRENCY = 4;

// ─── v5 violation regexes ─────────────────────────────────────────────────────
//
// These match the superset of:
//   (a) the task-specified patterns: [!！], emotional tails, pre-v5 openers
//   (b) the META_HOOK_PATTERN in src/lib/llm.ts (paper-description phrases)
//
// Detection intentionally casts a WIDER net than the retry guard so that
// anything the retry guard would catch is also flagged for regeneration.

const ZH_V5_VIOLATION =
  /[!！]|[—―–]|惊艳|太神奇|改变.{0,4}体验|真吓人|太(神奇|可怕|疯狂)了|惊呆|绝了|你知道吗|想象一下|这个新|一种新型|一个新系统|这个新?(方法|技术|模型|模拟器|系统|研究)|^一[种个][^，。]{0,10}(方法|技术|模型|系统|工具|拍卖|模拟器|算法)|该研究|这项(研究|技术)/i;

const EN_V5_VIOLATION =
  /[!]|[—–]|terrifying[.!]?\s*$|mind-blowing[.!]?\s*$|amazing[.!]?\s*$|did you know|imagine[, ]|what if[, ]|new research|scientists found|scientists discovered|this (new )?(method|model|approach|technique|study|simulator|system)|the (researchers|study|paper)/i;

/** META_HOOK_PATTERN verbatim from src/lib/llm.ts — used as the retry gate. */
const META_HOOK_PATTERN =
  /这个新?(方法|技术|模型|模拟器|系统|研究)|^一[种个][^，。]{0,10}(方法|技术|模型|系统|工具|拍卖|模拟器|算法)|该研究|这项(研究|技术)|真吓人|太(神奇|可怕|疯狂)了|惊呆|绝了|[!！]\s*$|[—―–]|this (new )?(method|model|approach|technique|study|simulator|system)|the (researchers|study|paper)|(terrifying|mind-blowing|amazing)[.!]?\s*$/i;

function zhViolates(hook: string | null | undefined): boolean {
  if (!hook) return false;
  return ZH_V5_VIOLATION.test(hook.trim());
}

function enViolates(hook: string | null | undefined): boolean {
  if (!hook) return false;
  return EN_V5_VIOLATION.test(hook.trim());
}

function rowViolates(zh: string | null | undefined, en: string | null | undefined): boolean {
  return zhViolates(zh) || enViolates(en);
}

// ─── types ────────────────────────────────────────────────────────────────────
interface PaperRow {
  id: string;
  title: string;
  abstract: string | null;
  categories: string[];
  primary_category: string | null;
  hook_summary_zh: string | null;
  hook_summary_en: string | null;
  plain_summary_en: string | null;
  plain_summary_zh: string | null;
  human_category: string | null;
  source: string | null;
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────
async function fetchArxivPapers(): Promise<PaperRow[]> {
  const all: PaperRow[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("papers")
      .select(
        "id, title, abstract, categories, primary_category, hook_summary_zh, hook_summary_en, plain_summary_en, plain_summary_zh, human_category, source",
      )
      .or("source.eq.arxiv,source.is.null")
      .order("published_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`papers query failed: ${error.message}`);
    const rows = (data ?? []) as PaperRow[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

// ─── v5 generation (mirrors src/lib/llm.ts generatePaperMetadataOnce) ─────────
function normalizeHook(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  const words = trimmed.split(" ").filter(Boolean);
  if (words.length <= 28) return trimmed;
  return `${words.slice(0, 28).join(" ").replace(/[,.!?;:]+$/, "")}.`;
}

const VALID_CATEGORIES = ["AI & Robots", "Your Health", "Your Money", "Your Food", "Climate"] as const;

function validateCategory(cat: string | undefined): string {
  if (cat && (VALID_CATEGORIES as readonly string[]).includes(cat)) return cat;
  return "AI & Robots";
}

async function generateV5Once(
  paper: Pick<PaperRow, "title" | "abstract" | "categories">,
): Promise<{
  hook: string;
  hookZh: string;
  humanCategory: string;
  plainSummary: string;
  plainSummaryZh: string;
}> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    max_tokens: 800,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You process academic papers for a general audience. Output JSON only.",
      },
      {
        role: "user",
        content: [
          "Given this research paper, generate six things:",
          '1) "hook": ONE surprise you could blurt out mid-conversation to make someone go "wait, really?". Plain spoken English, ≤100 characters. State the FACT ITSELF — what happens in the world — never describe the paper: any phrasing like "this method/model/simulator/approach/study/technique can..." is FORBIDDEN. Must contain at least one concrete detail (a number, a named thing, a sharp before/after). Talk like a person at a dinner table, but keep it deadpan: the surprise must come from the fact itself — NO emotional editorializing ("terrifying", "amazing", "mind-blowing"), NO exclamation marks, and NO em-dash or en-dash (— or –); use commas instead. End with a period. NO jargon, NO hedging, NO template openers ("Did you know", "Imagine", "What if", "New research", "Scientists found").',
          '2) "tags": 3-5 short English tags (1-3 words each).',
          '3) "humanCategory": classify into exactly ONE of: "AI & Robots", "Your Health", "Your Money", "Your Food", "Climate". If none fit, default to "AI & Robots".',
          '4) "plainSummary": explain this paper so a curious 14-year-old could understand it. No jargon, use concrete examples. Max 3 sentences.',
          '5) "hookZh": 用中文写一句能在聊天里直接讲出口、让人"啊？真的假的"的惊讶点。不超过40个汉字，口语通俗。必须说"世界上发生了什么"这个事实本身，严禁描述论文——凡是"这个方法/这项技术/一种新型XX方法/一个新系统/该研究 能……"式的句子一律不合格，也不要以"一种/一个"开头介绍任何方法或系统——直接从事实主体开头（比如"膝盖扫描现在只要原来1/12的时间"，而不是"一种新型MRI方法能将扫描时间缩短12倍"）。必须包含至少一个具体细节（数字、具体对象、鲜明的前后反差）。语气克制冷静：惊讶感必须来自事实本身，禁止情绪化词尾（真吓人/太神奇了/惊呆了/绝了），禁止感叹号，用句号收尾。禁用含糊词（可能/或许）和套路开头（你知道吗/想象/最新研究/科学家发现）。禁用破折号（——、—、―），改用逗号或句号。',
          '6) "plainSummaryZh": 用中文向一个好奇的14岁少年解释这篇论文。不要用专业术语，用具体的例子。最多3句话。',
          "",
          "Examples of the hook style:",
          'GOOD hook: "A single ChatGPT-style answer can burn through as much water as a small bottle you\'d drink." — concrete, a vivid comparison, sayable out loud.',
          'BAD hook: "New research investigates the environmental resource footprint of large language model inference." — jargon, template opener, no surprise.',
          'GOOD hookZh: "训练一个大模型排的碳，相当于五辆车从出厂到报废的全部排放。" — 有具体数字和反差，能直接讲给人听。',
          'BAD hookZh: "最新研究探讨了大型语言模型在推理过程中的资源消耗问题。" — 套路开头、术语堆砌、没有惊讶点。',
          'BAD hookZh: "这个新方法可以把任何视频变成4D体验，制作沉浸式内容更简单了。" — 在描述论文（"这个新方法"），不是在说事实；没有让人惊讶的具体点。',
          'GOOD hookZh: "一段普通手机视频，现在能直接变成可以绕着走的立体场景。" — 说的是发生了什么，画面感强，语气克制，讲出来别人能接话。',
          "",
          `Title: ${paper.title}`,
          `Abstract: ${(paper.abstract ?? "").slice(0, 1500)}`,
          `Categories: ${(paper.categories ?? []).join(", ")}`,
          "",
          'Return strict JSON: {"hook":"...","tags":["..."],"humanCategory":"...","plainSummary":"...","hookZh":"...","plainSummaryZh":"..."}',
        ].join("\n"),
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(rawContent) as {
    hook?: string;
    hookZh?: string;
    humanCategory?: string;
    plainSummary?: string;
    plainSummaryZh?: string;
  };

  return {
    hook: normalizeHook(parsed.hook ?? paper.title),
    hookZh: parsed.hookZh?.trim() ?? "",
    humanCategory: validateCategory(parsed.humanCategory),
    plainSummary: parsed.plainSummary?.trim() ?? "",
    plainSummaryZh: parsed.plainSummaryZh?.trim() ?? "",
  };
}

/** Two-attempt wrapper mirroring generatePaperMetadata in src/lib/llm.ts. */
async function generateV5(
  paper: PaperRow,
): Promise<{ hook: string; hookZh: string; humanCategory: string; plainSummary: string; plainSummaryZh: string }> {
  const first = await generateV5Once(paper);
  const firstClean = !META_HOOK_PATTERN.test(first.hookZh) && !META_HOOK_PATTERN.test(first.hook);
  if (firstClean && !ZH_V5_VIOLATION.test(first.hookZh) && !EN_V5_VIOLATION.test(first.hook)) {
    return first;
  }
  // One retry on meta-description slip
  const second = await generateV5Once(paper);
  const secondClean =
    !META_HOOK_PATTERN.test(second.hookZh) && !META_HOOK_PATTERN.test(second.hook) &&
    !ZH_V5_VIOLATION.test(second.hookZh) && !EN_V5_VIOLATION.test(second.hook);
  if (secondClean) return second;

  // Third attempt: explicit directive to start from the result, not the method
  const third = await generateV5Targeted(paper);
  const thirdClean =
    !ZH_V5_VIOLATION.test(third.hookZh) && !EN_V5_VIOLATION.test(third.hook);
  return thirdClean ? third : (secondClean ? second : first);
}

/**
 * Targeted third-attempt generation for papers whose model defaults to
 * "一种新方法/一个新系统" hooks. Uses a reframed prompt that explicitly
 * bans the start-with-method pattern and asks for the result/observation first.
 */
async function generateV5Targeted(
  paper: Pick<PaperRow, "title" | "abstract" | "categories">,
): Promise<{
  hook: string;
  hookZh: string;
  humanCategory: string;
  plainSummary: string;
  plainSummaryZh: string;
}> {
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.9,
    max_tokens: 800,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You process academic papers for a general audience. Output JSON only.",
      },
      {
        role: "user",
        content: [
          "IMPORTANT: Previous attempts kept starting with '一种新方法' or '这个新系统'. This is strictly FORBIDDEN.",
          "",
          "For hookZh: Start from the RESULT or OBSERVATION in the world — not from the technique.",
          "  FORBIDDEN starts: 一种新…, 一个新…, 这个新…, 该研究…, 这项研究…",
          "  REQUIRED start: from the thing that CHANGED or the fact that is surprising.",
          "  Example — if a paper speeds up MRI: say '膝盖扫描现在只要原来1/12的时间' not '一种新型MRI方法能将扫描时间缩短12倍'.",
          "  The hookZh must start with the subject of the world-change, not the method.",
          "",
          "Return JSON: {\"hook\":\"...\",\"tags\":[\"...\"],\"humanCategory\":\"...\",\"plainSummary\":\"...\",\"hookZh\":\"...\",\"plainSummaryZh\":\"...\"}",
          "",
          `Title: ${paper.title}`,
          `Abstract: ${(paper.abstract ?? "").slice(0, 1500)}`,
          `Categories: ${(paper.categories ?? []).join(", ")}`,
          "",
          'humanCategory must be ONE of: "AI & Robots", "Your Health", "Your Money", "Your Food", "Climate".',
          "hook: plain English, ≤100 chars, no exclamation marks, no em-dash or en-dash (— or –), fact-first.",
          "hookZh: ≤40 Chinese chars, no exclamation marks, no emotional tails (真吓人/太神奇了/惊呆了), no dashes (——、—、―; use comma instead), end with period.",
        ].join("\n"),
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(rawContent) as {
    hook?: string;
    hookZh?: string;
    humanCategory?: string;
    plainSummary?: string;
    plainSummaryZh?: string;
  };

  return {
    hook: normalizeHook(parsed.hook ?? paper.title),
    hookZh: parsed.hookZh?.trim() ?? "",
    humanCategory: validateCategory(parsed.humanCategory),
    plainSummary: parsed.plainSummary?.trim() ?? "",
    plainSummaryZh: parsed.plainSummaryZh?.trim() ?? "",
  };
}

// ─── concurrency helper ───────────────────────────────────────────────────────
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

// ─── Pass 1: Detection ────────────────────────────────────────────────────────
function detectViolations(papers: PaperRow[]): {
  flagged: PaperRow[];
  zhCount: number;
  enCount: number;
} {
  const flagged = papers.filter((p) => rowViolates(p.hook_summary_zh, p.hook_summary_en));
  const zhCount = papers.filter((p) => zhViolates(p.hook_summary_zh)).length;
  const enCount = papers.filter((p) => enViolates(p.hook_summary_en)).length;
  return { flagged, zhCount, enCount };
}

// ─── Pass 2: Regeneration ─────────────────────────────────────────────────────
async function regeneratePass(flagged: PaperRow[]): Promise<{
  updated: number;
  failed: number;
  beforeAfter: Array<{ id: string; beforeZh: string; afterZh: string }>;
}> {
  let updated = 0;
  let failed = 0;
  const beforeAfter: Array<{ id: string; beforeZh: string; afterZh: string }> = [];

  await pMap(
    flagged,
    async (paper, idx) => {
      const label = `[${idx + 1}/${flagged.length}]`;

      // Resumability: re-check the in-memory snapshot; another pass may have already fixed this row
      if (!rowViolates(paper.hook_summary_zh, paper.hook_summary_en)) {
        console.log(`  [SKIP] ${label} ${paper.id} — already clean`);
        return;
      }

      try {
        const result = await generateV5(paper);

        // NOTE: human_category is intentionally excluded from this update.
        // Category writes must be deterministic via categoryFromPrefix()
        // in src/lib/llm.ts — never LLM opinion (incident 2026-07-04).
        const { error } = await supabase
          .from("papers")
          .update({
            hook_summary_en: result.hook,
            hook_summary_zh: result.hookZh,
            plain_summary_en: result.plainSummary,
            plain_summary_zh: result.plainSummaryZh,
          })
          .eq("id", paper.id);

        if (error) {
          console.error(`  [FAIL] ${label} ${paper.id}: ${error.message}`);
          failed++;
        } else {
          console.log(
            `  [OK] ${label} ${paper.id}\n    zh: ${result.hookZh.slice(0, 60)}`,
          );
          if (beforeAfter.length < 6) {
            beforeAfter.push({
              id: paper.id,
              beforeZh: paper.hook_summary_zh ?? "(none)",
              afterZh: result.hookZh,
            });
          }
          updated++;
        }
      } catch (err) {
        console.error(`  [FAIL] ${label} ${paper.id}: ${(err as Error).message}`);
        failed++;
      }
    },
    CONCURRENCY,
  );

  return { updated, failed, beforeAfter };
}

// ─── Pass 3: Category sanity ──────────────────────────────────────────────────
interface CategoryCheck {
  id: string;
  title: string;
  currentCategory: string | null;
  suggestedCategory: string;
  confident: boolean;
}

async function checkCategory(paper: PaperRow): Promise<CategoryCheck> {
  const hook = paper.hook_summary_en ?? paper.hook_summary_zh ?? paper.title;

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0,
    max_tokens: 100,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You classify research papers. Output JSON only.",
      },
      {
        role: "user",
        content: [
          `Paper title: ${paper.title}`,
          `Hook: ${hook.slice(0, 200)}`,
          `Current category: ${paper.human_category ?? "none"}`,
          "",
          `Choose the single best category from: ${VALID_CATEGORIES.join(", ")}.`,
          `Set "confident" to true ONLY if the current category is clearly wrong and your suggestion is obviously better.`,
          `Return JSON: {"category":"...","confident":true|false}`,
        ].join("\n"),
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(rawContent) as { category?: string; confident?: boolean };

  return {
    id: paper.id,
    title: paper.title,
    currentCategory: paper.human_category,
    suggestedCategory: validateCategory(parsed.category),
    confident: !!parsed.confident,
  };
}

// ─── HARDENED: category writes must be deterministic via categoryFromPrefix()
// in src/lib/llm.ts — never via LLM opinion (incident 2026-07-04).
// This pass is REPORT-ONLY: it logs mismatches but NEVER writes human_category.
// To repair categories, run scripts/repair-arxiv-categories.ts instead.
async function categoryPass(papers: PaperRow[]): Promise<{
  mismatches: CategoryCheck[];
  changes: Array<{ id: string; title: string; from: string | null; to: string }>;
}> {
  console.log(`\nPass 3: Category sanity (REPORT-ONLY) — checking ${papers.length} arxiv papers...`);
  console.log("  NOTE: This pass never writes human_category (incident 2026-07-04 hardening).");
  console.log("  To repair categories, run: npx tsx scripts/repair-arxiv-categories.ts");

  const checks = await pMap(
    papers,
    async (paper, idx) => {
      if ((idx + 1) % 25 === 0) {
        console.log(`  category check ${idx + 1}/${papers.length}...`);
      }
      return checkCategory(paper);
    },
    CONCURRENCY,
  );

  const mismatches = checks.filter((c) => c.currentCategory !== c.suggestedCategory);
  console.log(`  ${mismatches.length} potential mismatches found (report only — no changes written):`);
  for (const m of mismatches) {
    console.log(
      `    [MISMATCH] ${m.id} | "${m.title.slice(0, 60)}" | current="${m.currentCategory}" suggested="${m.suggestedCategory}" | confident=${m.confident}`,
    );
  }

  // Category writes must be deterministic via the ingest mapping, never LLM opinion
  // (incident 2026-07-04). The auto-fix block has been removed. No DB writes here.
  const changes: Array<{ id: string; title: string; from: string | null; to: string }> = [];
  return { mismatches, changes };
}

// ─── Pass 4: Verification ─────────────────────────────────────────────────────
async function verifyPass(): Promise<{ violations: number; nullHooks: number; total: number }> {
  const papers = await fetchArxivPapers();
  const violating = papers.filter((p) => rowViolates(p.hook_summary_zh, p.hook_summary_en));
  const nullHookRows = papers.filter((p) => !p.hook_summary_zh || !p.hook_summary_en);

  console.log(`\nPass 4: Verification`);
  console.log(`  Total arxiv rows: ${papers.length}`);
  console.log(`  Violations remaining: ${violating.length}`);
  console.log(`  Rows with null hook (zh or en): ${nullHookRows.length}`);

  if (violating.length > 0) {
    console.log("  Remaining violations:");
    for (const v of violating.slice(0, 10)) {
      if (zhViolates(v.hook_summary_zh))
        console.log(`    [ZH] ${v.id}: ${v.hook_summary_zh}`);
      if (enViolates(v.hook_summary_en))
        console.log(`    [EN] ${v.id}: ${v.hook_summary_en}`);
    }
  }

  return {
    violations: violating.length,
    nullHooks: nullHookRows.length,
    total: papers.length,
  };
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[backfill-paper-metadata] model=${MODEL}`);

  // ─── Pass 1: Detection ────────────────────────────────────────────────────
  console.log("\nPass 1: Detection — fetching all arxiv papers...");
  const papers = await fetchArxivPapers();
  console.log(`  Total arxiv rows: ${papers.length}`);

  const { flagged, zhCount, enCount } = detectViolations(papers);
  console.log(`  Flagged (v5 violations): ${flagged.length}`);
  console.log(`  ZH violations: ${zhCount}`);
  console.log(`  EN violations: ${enCount}`);

  // ─── Pass 2: Regeneration ─────────────────────────────────────────────────
  let regenUpdated = 0;
  let regenFailed = 0;
  let beforeAfter: Array<{ id: string; beforeZh: string; afterZh: string }> = [];

  if (flagged.length === 0) {
    console.log("\nPass 2: No flagged rows — nothing to regenerate.");
  } else {
    console.log(`\nPass 2: Regenerating ${flagged.length} flagged rows (concurrency=${CONCURRENCY})...`);
    ({ updated: regenUpdated, failed: regenFailed, beforeAfter } = await regeneratePass(flagged));
    console.log(`\n  Regeneration done: ${regenUpdated} updated, ${regenFailed} failed.`);
  }

  // ─── Pass 3: Category sanity ──────────────────────────────────────────────
  // Fetch fresh after regeneration for category report pass.
  // NOTE: human_category may NOT have changed here — categoryPass is report-only
  // (incident 2026-07-04 hardening). Category writes must go through
  // scripts/repair-arxiv-categories.ts which uses the deterministic ingest mapping.
  const freshPapers = await fetchArxivPapers();
  const { mismatches: catMismatches } = await categoryPass(freshPapers);
  const catChanges: Array<{ id: string; title: string; from: string | null; to: string }> = [];

  console.log(`\n  Category report: ${catMismatches.length} LLM-suggested mismatches (none applied — report only).`);

  // ─── Pass 4: Verification ─────────────────────────────────────────────────
  const { violations, nullHooks, total } = await verifyPass();

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n=== FINAL SUMMARY ===");
  console.log(`Total arxiv rows:       ${total}`);
  console.log(`Flagged in detection:   ${flagged.length} (zh=${zhCount}, en=${enCount})`);
  console.log(`Regenerated:            ${regenUpdated} updated, ${regenFailed} failed`);
  console.log(`Category mismatches:    ${catMismatches.length} (reported only — 0 written; use repair-arxiv-categories.ts to fix)`);
  console.log(`Final violations:       ${violations}`);
  console.log(`Final null hooks:       ${nullHooks}`);
  console.log(`Status:                 ${violations === 0 ? "PASS ✓" : "FAIL ✗ — see violations above"}`);

  if (beforeAfter.length > 0) {
    console.log("\n=== BEFORE / AFTER ZH EXAMPLES ===");
    for (const ex of beforeAfter) {
      console.log(`\n  [${ex.id}]`);
      console.log(`  BEFORE: ${ex.beforeZh}`);
      console.log(`  AFTER:  ${ex.afterZh}`);
    }
  }
}

main().catch((err) => {
  console.error("backfill-paper-metadata crashed:", err);
  process.exitCode = 1;
});
