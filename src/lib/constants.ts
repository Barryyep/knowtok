import type { DomainKey } from "@/types/domain";

export const DOMAIN_OPTIONS: Array<{ key: DomainKey; label: string }> = [
  { key: "cs", label: "CS" },
  { key: "physics", label: "Physics" },
  { key: "math", label: "Math" },
];

export const IMPACT_PROMPT_VERSION = "impact_v1";
export const HOOK_PROMPT_VERSION = "hook_v1";
