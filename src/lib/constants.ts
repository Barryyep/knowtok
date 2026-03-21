import type { DomainKey, HumanCategory } from "@/types/domain";

export const DOMAIN_OPTIONS: Array<{ key: DomainKey; label: string }> = [
  { key: "cs", label: "CS" },
  { key: "physics", label: "Physics" },
  { key: "math", label: "Math" },
  { key: "q-bio", label: "Q-Bio" },
  { key: "q-fin", label: "Q-Fin" },
  { key: "econ", label: "Econ" },
  { key: "astro-ph", label: "Astro" },
];

export const CATEGORY_OPTIONS: Array<{ key: HumanCategory; label: string }> = [
  { key: "AI & Robots", label: "AI & Robots" },
  { key: "Your Health", label: "Your Health" },
  { key: "Your Money", label: "Your Money" },
  { key: "Your Food", label: "Your Food" },
  { key: "Climate", label: "Climate" },
];

export const CURIOSITY_TAGS = [
  "AI & Robots",
  "Your Health",
  "Your Money",
  "Your Food",
  "Climate",
  "Space",
  "Energy",
] as const;

export const TAG_TO_CATEGORY: Record<string, HumanCategory> = {
  "AI & Robots": "AI & Robots",
  "Your Health": "Your Health",
  "Your Money": "Your Money",
  "Your Food": "Your Food",
  "Climate": "Climate",
};

export const IMPACT_PROMPT_VERSION = "impact_v1";
export const HOOK_PROMPT_VERSION = "hook_v2";
