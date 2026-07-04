import type { AppLanguage } from "./types";

/** Must match the human_category values in the papers table. */
export const CATEGORY_META: Record<string, { emoji: string; en: string; zh: string }> = {
  "AI & Robots": { emoji: "🤖", en: "AI & Robots", zh: "AI与机器人" },
  "Your Health": { emoji: "🫀", en: "Health", zh: "健康" },
  "Your Money": { emoji: "💰", en: "Money", zh: "财经" },
  "Your Food": { emoji: "🍜", en: "Food", zh: "食物" },
  Climate: { emoji: "🌍", en: "Climate", zh: "气候" },
};

const FALLBACK = { emoji: "💡", en: "Research", zh: "科研" };

export function categoryEmoji(humanCategory: string): string {
  return (CATEGORY_META[humanCategory] ?? FALLBACK).emoji;
}

export function categoryLabel(humanCategory: string, language: AppLanguage): string {
  return (CATEGORY_META[humanCategory] ?? FALLBACK)[language];
}
