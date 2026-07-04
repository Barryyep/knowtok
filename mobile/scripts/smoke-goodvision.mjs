/**
 * Smoke test for the goodvision gateway + fact prompt, runnable without
 * building the app:
 *
 *   GOODVISION_API_KEY=sk-... node scripts/smoke-goodvision.mjs
 *
 * Optional: GOODVISION_MODEL, GOODVISION_BASE_URL, FACT_LANG=en
 */

const apiKey = process.env.GOODVISION_API_KEY;
const baseUrl = process.env.GOODVISION_BASE_URL ?? "https://api.goodvision.tech";
const model = process.env.GOODVISION_MODEL ?? "claude-sonnet-4-6";
const lang = process.env.FACT_LANG === "en" ? "en" : "zh";

if (!apiKey) {
  console.error("Set GOODVISION_API_KEY first, e.g.:");
  console.error("  GOODVISION_API_KEY=sk-... node scripts/smoke-goodvision.mjs");
  process.exit(1);
}

const profile = {
  name: "Barry",
  occupation: lang === "zh" ? "软件工程师" : "software engineer",
  interests: lang === "zh" ? "咖啡, 航天, 网球" : "coffee, space, tennis",
  language: lang,
};

const system =
  lang === "zh"
    ? "你是 KnowTok 的每日冷知识作者。你为一位特定用户写一条量身定制的 fun fact:必须真实、具体、出人意料。只输出严格 JSON,不要任何其他文字。"
    : "You are KnowTok's daily fun-fact writer. Write one tailored, true, surprising fun fact. Output strict JSON only.";

const user = [
  `Today's date: ${new Date().toISOString().slice(0, 10)}`,
  "",
  "About the reader:",
  `Name: ${profile.name}`,
  `Occupation: ${profile.occupation}`,
  `Interests: ${profile.interests}`,
  "",
  "Write ONE fun fact tailored to this reader's occupation or interests.",
  'Return strict JSON: {"emoji":"<one emoji>","topic":"...","fact":"...","whyCare":"..."}',
].join("\n");

console.log(`POST ${baseUrl}/v1/messages (model: ${model}, lang: ${lang})…`);
const started = Date.now();

const res = await fetch(`${baseUrl}/v1/messages`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model,
    max_tokens: 600,
    system,
    messages: [{ role: "user", content: user }],
  }),
  signal: AbortSignal.timeout(120_000),
});

const body = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}\n${body.slice(0, 500)}`);
  process.exit(1);
}

const reply = JSON.parse(body);
const text = reply.content?.filter((b) => b.type === "text").map((b) => b.text).join("") ?? "";
const jsonStart = text.indexOf("{");
const jsonEnd = text.lastIndexOf("}");
const fact = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

console.log(`OK in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
console.log(`  ${fact.emoji}  [${fact.topic}]`);
console.log(`  ${fact.fact}`);
console.log(`  → ${fact.whyCare}`);
console.log(`\nusage: ${JSON.stringify(reply.usage)}`);
