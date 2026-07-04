import type { DailyFact, Profile } from "./types";

export interface WhyCarePrompt {
  system: string;
  user: string;
}

/**
 * "Why you'd care" — one personalized sentence connecting a real paper
 * to this reader. Plain-text reply (no JSON), so there's nothing to
 * mis-parse; the fact itself comes from the papers table, not the LLM.
 */
export function buildWhyCarePrompt(profile: Profile, fact: DailyFact): WhyCarePrompt {
  const isZh = profile.language === "zh";

  const system = isZh
    ? "你是 KnowTok 的个性化解读作者。给定一篇真实论文的要点和读者画像,你用一句话(25-50个字)告诉这位读者:这项研究和 TA 的工作或爱好有什么具体关联。语气像朋友聊天,具体、不吹嘘、不编造。只输出这一句话,不要任何前缀、引号或解释。"
    : "You write KnowTok's personalized takeaways. Given a real paper's gist and a reader profile, write ONE sentence telling this reader how the research connects to their work or hobbies. Conversational, specific, no hype, no fabrication. Output only that sentence — no prefix, quotes, or explanation.";

  const profileLines = [
    profile.name ? `Name: ${profile.name}` : null,
    profile.occupation ? `Occupation: ${profile.occupation}` : null,
    profile.interests ? `Interests: ${profile.interests}` : null,
  ].filter(Boolean);

  const user = [
    "Reader:",
    profileLines.length > 0 ? profileLines.join("\n") : "(no profile)",
    "",
    "Paper:",
    fact.source.title ? `Title: ${fact.source.title}` : null,
    `Gist: ${fact.fact}`,
    `Category: ${fact.topic}`,
    "",
    isZh ? "写出那一句话(中文):" : "Write the sentence (English):",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { system, user };
}

/** Strip wrapping quotes/whitespace from the model's one-liner. */
export function cleanWhyCare(raw: string): string {
  return raw
    .trim()
    .replace(/^["'“”「]+/, "")
    .replace(/["'“”」]+$/, "")
    .trim();
}
