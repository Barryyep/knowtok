import { domainById } from "./taxonomy";
import type { AppLanguage } from "./types";

/**
 * Legacy human_category labels (arXiv rows). OWID rows instead store a
 * taxonomy DOMAIN id in human_category (the agreed convention), so lookups
 * fall through to the taxonomy for those.
 */
export const CATEGORY_META: Record<string, { emoji: string; en: string; zh: string }> = {
  "AI & Robots": { emoji: "🤖", en: "AI & Robots", zh: "AI与机器人" },
  "Your Health": { emoji: "🫀", en: "Health", zh: "健康" },
  "Your Money": { emoji: "💰", en: "Money", zh: "财经" },
  "Your Food": { emoji: "🍜", en: "Food", zh: "食物" },
  Climate: { emoji: "🌍", en: "Climate", zh: "气候" },
};

/** Per-domain emoji for OWID rows keyed by taxonomy domain id. */
const DOMAIN_EMOJI: Record<string, string> = {
  tech_ai: "🤖",
  space: "🪐",
  health: "🫀",
  mind: "🧠",
  money: "💰",
  food: "🍜",
  climate: "🌍",
  history: "🏛️",
  nature: "🌿",
  society: "🌐",
};

const FALLBACK = { emoji: "💡", en: "Research", zh: "科研" };

export function categoryEmoji(humanCategory: string): string {
  const meta = CATEGORY_META[humanCategory];
  if (meta) return meta.emoji;
  if (domainById(humanCategory)) return DOMAIN_EMOJI[humanCategory] ?? FALLBACK.emoji;
  return FALLBACK.emoji;
}

export function categoryLabel(humanCategory: string, language: AppLanguage): string {
  const meta = CATEGORY_META[humanCategory];
  if (meta) return meta[language];
  const domain = domainById(humanCategory);
  if (domain) return domain[language];
  return FALLBACK[language];
}
