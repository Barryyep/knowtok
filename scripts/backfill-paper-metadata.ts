/**
 * Backfill script: generates plain_summary, human_category, and Chinese
 * content for existing papers that are missing them.
 *
 * Usage: npx tsx scripts/backfill-paper-metadata.ts
 */

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: true });
loadDotenv({ path: ".env", override: false });

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function generateMetadata(title: string, abstract: string, categories: string[]): Promise<{
  plainSummary: string;
  plainSummaryZh: string;
  hookZh: string;
  humanCategory: string;
}> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You process academic papers for a general audience. Output JSON only.",
        },
        {
          role: "user",
          content: [
            "Given this research paper, generate four things:",
            '1) "humanCategory": classify into exactly ONE of: "AI & Robots", "Your Health", "Your Money", "Your Food", "Climate". If none fit, default to "AI & Robots".',
            '2) "plainSummary": explain this paper so a curious 14-year-old could understand it. No jargon, use concrete examples. Max 3 sentences. In English.',
            '3) "hookZh": 用中文写一句话，不超过50个汉字，通俗易懂、不用专业术语。直接抛出最令人意外的具体内容——数字、反差、或利害关系。绝对不要用套路开头：不要以"你知道吗""想象""如果我告诉你""最新研究""科学家发现"之类开头，直接说出惊人的事实本身。',
            '4) "plainSummaryZh": 用中文向一个好奇的14岁少年解释这篇论文。不要用专业术语，用具体的例子。最多3句话。',
            "",
            `Title: ${title}`,
            `Abstract: ${abstract.slice(0, 1500)}`,
            `Categories: ${categories.join(", ")}`,
            "",
            'Return strict JSON: {"humanCategory":"...","plainSummary":"...","hookZh":"...","plainSummaryZh":"..."}',
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);

  const validCategories = ["AI & Robots", "Your Health", "Your Money", "Your Food", "Climate"];
  const humanCategory = validCategories.includes(parsed.humanCategory)
    ? parsed.humanCategory
    : "AI & Robots";

  const plainSummary = parsed.plainSummary?.trim() || abstract.split(/[.!?]+/).slice(0, 3).join(". ").trim() + ".";
  const hookZh = parsed.hookZh?.trim() || "";
  const plainSummaryZh = parsed.plainSummaryZh?.trim() || "";

  return { humanCategory, plainSummary, hookZh, plainSummaryZh };
}

async function main() {
  // Find papers missing Chinese content OR plain_summary
  console.log("Fetching papers missing Chinese content or plain summary...");

  const { data: papers, error } = await supabase
    .from("papers")
    .select("id, title, abstract, categories, primary_category, hook_summary_zh, plain_summary_en")
    .or("plain_summary_en.is.null,hook_summary_zh.is.null")
    .limit(500);

  if (error) {
    console.error("Failed to fetch papers:", error.message);
    process.exit(1);
  }

  console.log(`Found ${papers.length} papers to backfill.`);

  let updated = 0;
  let failed = 0;

  for (const paper of papers) {
    try {
      const { humanCategory, plainSummary, hookZh, plainSummaryZh } = await generateMetadata(
        paper.title,
        paper.abstract,
        paper.categories,
      );

      const { error: updateError } = await supabase
        .from("papers")
        .update({
          plain_summary_en: plainSummary,
          human_category: humanCategory,
          hook_summary_zh: hookZh,
          plain_summary_zh: plainSummaryZh,
        })
        .eq("id", paper.id);

      if (updateError) {
        console.error(`  [FAIL] ${paper.id}: ${updateError.message}`);
        failed++;
      } else {
        console.log(`  [OK] ${paper.id} → ${humanCategory} | zh: ${hookZh.slice(0, 30)}...`);
        updated++;
      }

      // Rate limit: 200ms between calls
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`  [FAIL] ${paper.id}: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nBackfill complete: ${updated} updated, ${failed} failed out of ${papers.length} total.`);
}

main().catch(console.error);
