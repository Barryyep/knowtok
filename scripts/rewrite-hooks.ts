/**
 * Rewrite formulaic paper hooks.
 *
 * The old prompts forced catchphrase openers (你知道吗 / 想象一下 / Did you
 * know …). This script finds every paper whose zh OR en hook still opens
 * with a banned template phrase (or exceeds the length budget) and rewrites
 * BOTH hooks to lead directly with the surprising substance.
 *
 * Idempotent: re-running only touches papers that still offend, so a clean
 * DB is a no-op. Uses OpenAI (gpt-4o-mini by default) + service-role
 * Supabase updates. Run with: npx tsx scripts/rewrite-hooks.ts
 */

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: true, quiet: true });
loadDotenv({ path: ".env", override: false, quiet: true });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL_LOW_COST || process.env.OPENAI_MODEL || "gpt-4o-mini";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ZH_BANNED = ["你知道吗", "想象", "如果我告诉你", "最新研究", "科学家发现"];
const EN_BANNED = ["did you know", "imagine", "what if", "new research", "scientists found", "scientists discovered"];
const ZH_MAX = 50; // characters
const EN_MAX = 120; // characters

/** Count characters (code points), so CJK counts as 1 each. */
function charLen(s: string): number {
  return Array.from(s).length;
}

function zhOffends(hook: string | null | undefined): boolean {
  if (!hook) return false;
  const t = hook.trim();
  if (charLen(t) > ZH_MAX) return true;
  return ZH_BANNED.some((b) => t.startsWith(b));
}

function enOffends(hook: string | null | undefined): boolean {
  if (!hook) return false;
  const t = hook.trim();
  if (charLen(t) > EN_MAX) return true;
  const low = t.toLowerCase();
  return EN_BANNED.some((b) => low.startsWith(b));
}

interface PaperRow {
  id: string;
  title: string;
  abstract: string | null;
  plain_summary_en: string | null;
  plain_summary_zh: string | null;
  hook_summary_en: string | null;
  hook_summary_zh: string | null;
}

async function rewriteHooks(paper: PaperRow): Promise<{ hookEn: string; hookZh: string }> {
  const context = [
    `Title: ${paper.title}`,
    paper.abstract ? `Abstract: ${paper.abstract.slice(0, 1200)}` : null,
    paper.plain_summary_en ? `Plain summary (en): ${paper.plain_summary_en}` : null,
    paper.plain_summary_zh ? `Plain summary (zh): ${paper.plain_summary_zh}` : null,
    paper.hook_summary_en ? `Current en hook: ${paper.hook_summary_en}` : null,
    paper.hook_summary_zh ? `Current zh hook: ${paper.hook_summary_zh}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.7,
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You rewrite one-sentence research hooks for a curious general audience. Output JSON only.",
        },
        {
          role: "user",
          content: [
            "Rewrite this paper's hook in BOTH English and Chinese.",
            "",
            'Rules for "hookEn": ONE punchy sentence in plain English, ≤120 characters, no jargon. Lead DIRECTLY with the single most surprising, concrete thing — a number, a sharp contrast, or what is at stake. NEVER start with "Did you know", "Imagine", "What if", "New research", "Scientists found/discovered". Just state the striking fact itself.',
            'Rules for "hookZh": 用中文写一句话，不超过50个汉字，通俗易懂、不用专业术语。直接抛出最令人意外的具体内容——数字、反差、或利害关系。绝对不要用套路开头：不要以"你知道吗""想象""如果我告诉你""最新研究""科学家发现"之类开头，直接说出惊人的事实本身。',
            "",
            context,
            "",
            'Return strict JSON: {"hookEn":"...","hookZh":"..."}',
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${(await response.text()).slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as { hookEn?: string; hookZh?: string };
  return {
    hookEn: (parsed.hookEn ?? "").trim(),
    hookZh: (parsed.hookZh ?? "").trim(),
  };
}

async function fetchAllPapers(): Promise<PaperRow[]> {
  const all: PaperRow[] = [];
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("papers")
      .select("id, title, abstract, plain_summary_en, plain_summary_zh, hook_summary_en, hook_summary_zh")
      .order("published_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`papers query failed: ${error.message}`);
    const rows = (data ?? []) as PaperRow[];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

async function main() {
  console.log(`[rewrite-hooks] model=${MODEL}`);
  const papers = await fetchAllPapers();
  console.log(`Fetched ${papers.length} papers.`);

  const offending = papers.filter(
    (p) => zhOffends(p.hook_summary_zh) || enOffends(p.hook_summary_en),
  );
  console.log(`${offending.length} papers have a banned-opener / oversized hook. Rewriting…`);

  let updated = 0;
  let failed = 0;

  for (const paper of offending) {
    try {
      let { hookEn, hookZh } = await rewriteHooks(paper);

      // One retry if the rewrite still opens with a banned phrase.
      if (zhOffends(hookZh) || enOffends(hookEn)) {
        await new Promise((r) => setTimeout(r, 200));
        const retry = await rewriteHooks(paper);
        if (!zhOffends(retry.hookZh) && retry.hookZh) hookZh = retry.hookZh;
        if (!enOffends(retry.hookEn) && retry.hookEn) hookEn = retry.hookEn;
      }

      const update: Record<string, string> = {};
      // Only write a language if we produced a clean, non-empty hook for it.
      if (hookEn && !enOffends(hookEn)) update.hook_summary_en = hookEn;
      if (hookZh && !zhOffends(hookZh)) update.hook_summary_zh = hookZh;

      if (Object.keys(update).length === 0) {
        console.error(`  [SKIP] ${paper.id}: rewrite still offended, left unchanged`);
        failed++;
        continue;
      }

      const { error } = await supabase.from("papers").update(update).eq("id", paper.id);
      if (error) {
        console.error(`  [FAIL] ${paper.id}: ${error.message}`);
        failed++;
      } else {
        console.log(`  [OK] ${paper.id}\n        zh: ${update.hook_summary_zh ?? "(kept)"}\n        en: ${update.hook_summary_en ?? "(kept)"}`);
        updated++;
      }

      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`  [FAIL] ${paper.id}: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nRewrite complete: ${updated} updated, ${failed} failed out of ${offending.length} offending.`);

  // ---- Verify -------------------------------------------------------------
  const after = await fetchAllPapers();
  const remainingZh = after.filter((p) => zhOffends(p.hook_summary_zh));
  const remainingEn = after.filter((p) => enOffends(p.hook_summary_en));
  console.log(`\n[verify] remaining banned-opener/oversized hooks: zh=${remainingZh.length}, en=${remainingEn.length}`);
  if (remainingZh.length) {
    console.log("  zh offenders:", remainingZh.map((p) => p.id).join(", "));
  }
  if (remainingEn.length) {
    console.log("  en offenders:", remainingEn.map((p) => p.id).join(", "));
  }

  console.log("\n[verify] 5 sample hooks:");
  for (const p of after.slice(0, 5)) {
    console.log(`  • zh: ${p.hook_summary_zh ?? "(none)"}`);
    console.log(`    en: ${p.hook_summary_en ?? "(none)"}`);
  }
}

main().catch((err) => {
  console.error("rewrite-hooks crashed:", err);
  process.exitCode = 1;
});
