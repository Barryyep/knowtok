/**
 * Backfill script: generates plain_summary_en and human_category
 * for existing papers that don't have them.
 *
 * Usage: npx tsx scripts/backfill-paper-metadata.ts
 */

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
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You process academic papers for a general audience. Output JSON only.",
        },
        {
          role: "user",
          content: [
            "Given this research paper, generate two things:",
            '1) "humanCategory": classify into exactly ONE of: "AI & Robots", "Your Health", "Your Money", "Your Food", "Climate". If none fit, default to "AI & Robots".',
            '2) "plainSummary": explain this paper so a curious 14-year-old could understand it. No jargon, use concrete examples. Max 3 sentences.',
            "",
            `Title: ${title}`,
            `Abstract: ${abstract.slice(0, 1500)}`,
            `Categories: ${categories.join(", ")}`,
            "",
            'Return strict JSON: {"humanCategory":"...","plainSummary":"..."}',
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

  return { humanCategory, plainSummary };
}

async function main() {
  console.log("Fetching papers without plain_summary_en...");

  const { data: papers, error } = await supabase
    .from("papers")
    .select("id, title, abstract, categories, primary_category")
    .is("plain_summary_en", null)
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
      const { humanCategory, plainSummary } = await generateMetadata(
        paper.title,
        paper.abstract,
        paper.categories,
      );

      const { error: updateError } = await supabase
        .from("papers")
        .update({
          plain_summary_en: plainSummary,
          human_category: humanCategory,
        })
        .eq("id", paper.id);

      if (updateError) {
        console.error(`  [FAIL] ${paper.id}: ${updateError.message}`);
        failed++;
      } else {
        console.log(`  [OK] ${paper.id} → ${humanCategory}`);
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
