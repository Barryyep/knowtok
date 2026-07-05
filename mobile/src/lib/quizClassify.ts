/**
 * LLM classification of 「其他」 free-text answers collected during onboarding.
 * Batches all answers in one haiku-tier call, maps them to domain weights, and
 * merges into the ledger via applyClassifiedVotes before quizResult is computed.
 * ANY failure or timeout → returns {} so the quiz proceeds on deterministic votes.
 */
import { ENV_API_KEY } from "./config";
import { generateText } from "./goodvision";
import { extractJson } from "./jsonUtils";
import { DOMAINS } from "./taxonomy";
import type { OtherAnswer } from "./quiz";
import type { AppLanguage } from "./types";

const DOMAIN_IDS = DOMAINS.map((d) => d.id);
const CLASSIFY_TIMEOUT_MS = 6_000;
const HAIKU_MODEL = "claude-haiku-4-5";

const SYSTEM_PROMPT = [
  "Classify free-text survey answers into curiosity-domain weights.",
  `Valid domain ids: ${DOMAIN_IDS.join(", ")}.`,
  "For each answer, assign up to 2 domain ids with weights summing ≤ 0.5 per answer.",
  "Aggregate weights across all answers into a single votes object.",
  'Return strict JSON only: {"votes":{"domainId":weight,...}}',
  "If an answer fits no domain, skip it.",
].join("\n");

export async function classifyOtherAnswers(
  answers: OtherAnswer[],
  language: AppLanguage,
): Promise<Record<string, number>> {
  if (answers.length === 0) return {};
  const apiKey = ENV_API_KEY;
  if (!apiKey) return {};

  const isZh = language === "zh";
  const lines = answers.map(
    (a, i) => `${i + 1}. [question:${a.questionId}] ${a.text}`,
  );
  const user = isZh
    ? `对以下答案按领域分类：\n${lines.join("\n")}\n返回 JSON。`
    : `Classify these answers by domain:\n${lines.join("\n")}\nReturn JSON.`;

  try {
    const raw = await Promise.race<string>([
      generateText({
        system: SYSTEM_PROMPT,
        user,
        apiKey,
        maxTokens: 200,
        timeoutMs: CLASSIFY_TIMEOUT_MS,
        model: HAIKU_MODEL,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("classify timeout")), CLASSIFY_TIMEOUT_MS),
      ),
    ]);
    const parsed = extractJson<{ votes?: unknown }>(raw);
    if (!parsed?.votes || typeof parsed.votes !== "object") return {};
    const out: Record<string, number> = {};
    for (const [id, w] of Object.entries(parsed.votes as Record<string, unknown>)) {
      if (DOMAIN_IDS.includes(id) && typeof w === "number" && w > 0) {
        out[id] = (out[id] ?? 0) + Math.min(w, 0.5);
      }
    }
    return out;
  } catch {
    return {};
  }
}
