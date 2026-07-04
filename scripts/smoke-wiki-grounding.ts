/**
 * Smoke test for the free-tier Wikipedia grounding path.
 *
 * Exercises the REAL mobile module (mobile/src/lib/generalFactService.ts),
 * which uses plain fetch for both Wikipedia (REST) and goodvision (Anthropic
 * Messages API) — no supabase-js involved. Simulates a 建筑工人 persona and
 * prints the generated fact + grounding wiki URL + citation label.
 *
 * Usage: npx tsx scripts/smoke-wiki-grounding.ts
 */

import { config as loadDotenv } from "dotenv";

// goodvision key + model live in mobile/.env (EXPO_PUBLIC_*).
loadDotenv({ path: "mobile/.env", override: true, quiet: true });

async function main() {
  const { generateGeneralFact } = await import("../mobile/src/lib/generalFactService");

  const profile = {
    name: "测试用户",
    occupation: "建筑工人",
    interests: "混凝土, 建筑安全",
    language: "zh" as const,
  };

  console.log(`[smoke] persona: ${profile.occupation} (lang=${profile.language})`);
  const today = new Date().toISOString().slice(0, 10);
  const fact = await generateGeneralFact(profile, today, []);

  console.log("\n=== GENERATED FACT ===");
  console.log(`topic : ${fact.topic}`);
  console.log(`emoji : ${fact.emoji}`);
  console.log(`fact  : ${fact.fact}`);
  console.log(`whyCare: ${fact.whyCare}`);
  console.log("\n=== SOURCE ===");
  console.log(`kind  : ${fact.source.kind}`);
  console.log(`label : ${fact.source.label}`);
  console.log(`url   : ${fact.source.url ?? "(none)"}`);
}

main().catch((err) => {
  console.error("smoke-wiki-grounding failed:", err);
  process.exit(1);
});
