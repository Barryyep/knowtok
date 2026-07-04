import { ENV_API_KEY } from "./config";
import { generateText } from "./goodvision";
import { extractJson, hashStringToNumber } from "./jsonUtils";
import type { AppLanguage, DailyFact, Profile } from "./types";
import { fetchWikiGrounding, type WikiGrounding } from "./wikipedia";

/** Deterministic base36 hash so a general fact has a stable dedup id. */
function hashString(s: string): string {
  return hashStringToNumber(s).toString(36);
}

interface GeneralFactJson {
  fact?: string;
  topic?: string;
  emoji?: string;
  whyCare?: string;
}

function buildSystem(isZh: boolean): string {
  if (isZh) {
    return [
      "你为 Ohlo 生成一条真实、可核实的常识（不是学术论文），并根据读者的职业量身定制。",
      "只讲一条冷知识/常识，须来自读者职业相邻的领域，真实且经得起查证，不要编造。",
      "fact 要求：中文，不超过50个汉字，直接抛出最令人意外的具体内容（数字、反差、利害关系）。",
      "绝对不要用套路开头：不要以“你知道吗”“想象”“如果我告诉你”“最新研究”“科学家发现”之类开头。",
      "同时给出：topic（2-6个字的主题词）、emoji（一个贴切的表情）、whyCare（一句话25-50字，说明这条常识和读者的工作或生活的具体关联，接地气、不吹嘘、不编造）。",
      '只输出 JSON：{"fact":"...","topic":"...","emoji":"...","whyCare":"..."}',
    ].join("\n");
  }
  return [
    "You generate ONE true, verifiable piece of general knowledge (not an academic paper) tailored to the reader's occupation.",
    "It must come from a domain adjacent to their job, be factually accurate, and never fabricated.",
    'The "fact": plain English, ≤120 characters, leading directly with the single most surprising concrete thing (a number, a sharp contrast, or what is at stake).',
    'NEVER start with "Did you know", "Imagine", "What if", "New research", "Scientists found/discovered".',
    'Also provide: "topic" (a 1-2 word label), "emoji" (one fitting emoji), and "whyCare" (one sentence, ≤160 chars, on how this concretely connects to the reader\'s work or life — conversational, specific, no hype, no fabrication).',
    'Output JSON only: {"fact":"...","topic":"...","emoji":"...","whyCare":"..."}',
  ].join("\n");
}

function buildUser(profile: Profile, recentFacts: string[], isZh: boolean): string {
  const avoid = recentFacts.filter(Boolean).slice(0, 20);
  const profileLines = [
    profile.occupation ? `Occupation: ${profile.occupation}` : null,
    profile.interests ? `Interests: ${profile.interests}` : null,
  ].filter(Boolean);

  return [
    "Reader:",
    profileLines.length > 0 ? profileLines.join("\n") : "(no profile)",
    "",
    avoid.length > 0
      ? `${isZh ? "避免与这些最近的主题重复：" : "Avoid repeating these recent topics: "}${avoid.join(" / ")}`
      : "",
    isZh ? "输出 JSON。" : "Return the JSON.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Persona-adjacent Wikipedia search terms, derived from the occupation and
 * interests. The first hit with a usable extract wins; a small persona-aware
 * fallback keeps the free tier from ever running dry.
 */
function deriveSearchTerms(profile: Profile, isZh: boolean): string[] {
  const terms: string[] = [];
  if (profile.occupation?.trim()) terms.push(profile.occupation.trim());
  for (const interest of (profile.interests || "").split(/[,，、;；]/)) {
    const t = interest.trim();
    if (t) terms.push(t);
  }
  // Evergreen fallbacks so search never comes back completely empty.
  terms.push(isZh ? "科学" : "Science");
  return terms.slice(0, 4);
}

function buildGroundedSystem(isZh: boolean): string {
  if (isZh) {
    return [
      "你为 Ohlo 生成一条真实、可核实的常识，并根据读者的职业量身定制。",
      "下面会给你一段来自维基百科的资料。你写的 fact 必须完全基于这段资料、并能被它支持，绝对不能编造资料里没有的内容。",
      "fact 要求：中文，不超过50个汉字，直接抛出资料里最令人意外的具体内容（数字、反差、利害关系）。",
      "绝对不要用套路开头：不要以“你知道吗”“想象”“如果我告诉你”“最新研究”“科学家发现”之类开头。",
      "同时给出：topic（2-6个字的主题词）、emoji（一个贴切的表情）、whyCare（一句话25-50字，说明这条常识和读者的工作或生活的具体关联，接地气、不吹嘘、不编造）。",
      '只输出 JSON：{"fact":"...","topic":"...","emoji":"...","whyCare":"..."}',
    ].join("\n");
  }
  return [
    "You generate ONE true, verifiable piece of general knowledge tailored to the reader's occupation.",
    "You will be given a Wikipedia extract. Your fact MUST be grounded in and supported by that extract — never state anything not present in it.",
    'The "fact": plain English, ≤120 characters, leading directly with the single most surprising concrete thing from the extract (a number, a sharp contrast, or what is at stake).',
    'NEVER start with "Did you know", "Imagine", "What if", "New research", "Scientists found/discovered".',
    'Also provide: "topic" (a 1-2 word label), "emoji" (one fitting emoji), and "whyCare" (one sentence, ≤160 chars, on how this concretely connects to the reader\'s work or life — conversational, specific, no hype, no fabrication).',
    'Output JSON only: {"fact":"...","topic":"...","emoji":"...","whyCare":"..."}',
  ].join("\n");
}

function buildGroundedUser(
  profile: Profile,
  recentFacts: string[],
  grounding: WikiGrounding,
  isZh: boolean,
): string {
  const avoid = recentFacts.filter(Boolean).slice(0, 20);
  const profileLines = [
    profile.occupation ? `Occupation: ${profile.occupation}` : null,
    profile.interests ? `Interests: ${profile.interests}` : null,
  ].filter(Boolean);

  return [
    "Reader:",
    profileLines.length > 0 ? profileLines.join("\n") : "(no profile)",
    "",
    isZh ? `维基百科条目：${grounding.pageTitle}` : `Wikipedia article: ${grounding.pageTitle}`,
    isZh ? "资料：" : "Extract:",
    grounding.extract,
    "",
    avoid.length > 0
      ? `${isZh ? "避免与这些最近的主题重复：" : "Avoid repeating these recent topics: "}${avoid.join(" / ")}`
      : "",
    isZh ? "基于上面的资料输出 JSON。" : "Return the JSON, grounded in the extract above.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Generate one persona-tailored general-knowledge fact for the day. The
 * single LLM call returns the fact, its topic, an emoji, and the personalized
 * "why you'd care" line — so no follow-up whyCare call is needed.
 *
 * The fact is GROUNDED in a real Wikipedia page (search + summary on the zh or
 * en subdomain per the profile language), and the source links to that page.
 * If Wikipedia is unreachable, it falls back to ungrounded generation with the
 * legacy "综合知识 / General knowledge" label.
 */
export async function generateGeneralFact(
  profile: Profile,
  dateStr: string,
  recentFacts: string[] = [],
): Promise<DailyFact> {
  const isZh = profile.language === "zh";
  const lang: AppLanguage = isZh ? "zh" : "en";
  const apiKey = profile.apiKey?.trim() || ENV_API_KEY;

  let grounding: WikiGrounding | null = null;
  try {
    grounding = await fetchWikiGrounding(deriveSearchTerms(profile, isZh), lang);
  } catch (err) {
    console.warn("wikipedia grounding fetch failed:", err);
  }

  const system = grounding ? buildGroundedSystem(isZh) : buildSystem(isZh);
  const user = grounding
    ? buildGroundedUser(profile, recentFacts, grounding, isZh)
    : buildUser(profile, recentFacts, isZh);

  const attempt = async (): Promise<GeneralFactJson | null> => {
    const raw = await generateText({
      system,
      user,
      apiKey,
      maxTokens: 400,
      timeoutMs: 60_000,
    });
    return extractJson<GeneralFactJson>(raw);
  };

  let parsed = await attempt();
  if (!parsed?.fact?.trim()) {
    parsed = await attempt();
  }

  const fact = parsed?.fact?.trim();
  if (!fact) {
    throw new Error("general fact generation returned no fact");
  }

  const topic = parsed?.topic?.trim() || (isZh ? "常识" : "General");
  const emoji = parsed?.emoji?.trim() || "💡";
  const whyCare = parsed?.whyCare?.trim() || "";

  const source: DailyFact["source"] = grounding
    ? {
        kind: "general",
        factId: hashString(fact),
        url: grounding.pageUrl,
        label: isZh
          ? `维基百科 · ${grounding.pageTitle}`
          : `Wikipedia · ${grounding.pageTitle}`,
      }
    : {
        kind: "general",
        factId: hashString(fact),
        label: isZh ? "综合知识 · AI 整理" : "General knowledge · AI-curated",
      };

  return {
    date: dateStr,
    emoji,
    topic,
    fact,
    whyCare,
    source,
  };
}
