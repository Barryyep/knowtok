export type AppLanguage = "en" | "zh";

/** Local mirror of the Supabase user_personas row (subset the app uses). */
export interface Profile {
  name: string;
  /** Maps to user_personas.job_title. */
  occupation: string;
  /** Comma-separated; maps to user_personas.interests[]. */
  interests: string;
  language: AppLanguage;
  /** Optional goodvision key override (else EXPO_PUBLIC_GOODVISION_API_KEY). */
  apiKey?: string;
}

/**
 * Which content track produced a fact:
 * - "paper": real-time research (arXiv today; the future premium track)
 * - "general": broad general knowledge for personas research can't serve
 */
export type FactKind = "paper" | "general";

/** Citation for where a fact came from. */
export interface FactSource {
  kind: FactKind;
  /** Stable id for dedup: paper uuid, or a hash for general facts. */
  factId: string;
  /** Short display line, e.g. "arXiv:2507.01234 · 2026-07-01" or "综合知识". */
  label: string;
  /** Paper track only. */
  paperId?: string;
  arxivId?: string;
  title?: string;
  url?: string;
  publishedAt?: string;
}

/** Cached result of matching a persona to the content tracks. */
export interface PersonaTrack {
  /** Hash of the persona fields it was computed from. */
  personaHash: string;
  track: FactKind;
  /** For "paper": which human_category values fit this persona. */
  categories: string[];
}

export interface DailyFact {
  /** Local date the fact was generated for, YYYY-MM-DD. */
  date: string;
  emoji: string;
  /** Category label in the user's language, e.g. "AI与机器人". */
  topic: string;
  /**
   * The fact itself, in the user's language. Concise (≤ ~50 chars zh) and
   * NEVER opens with formulaic catchphrases (你知道吗/想象一下/Did you
   * know/Imagine…) — it leads with the surprising substance directly.
   */
  fact: string;
  /** Personalized "why you'd care", generated async; empty until ready. */
  whyCare: string;
  source: FactSource;
}

/** Row shape returned from the papers table (fields we select). */
export interface PaperRow {
  id: string;
  source: string | null;
  arxiv_id_base: string;
  title: string;
  hook_summary_en: string;
  hook_summary_zh: string | null;
  plain_summary_en: string | null;
  plain_summary_zh: string | null;
  human_category: string;
  published_at: string;
  abs_url: string;
}
