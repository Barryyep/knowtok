import AsyncStorage from "@react-native-async-storage/async-storage";

import { ENV_API_KEY } from "./config";
import { generateText } from "./goodvision";
import type { FactKind, PersonaTrack, Profile } from "./types";

const CACHE_PREFIX = "knowtok:personaTrack:v1:";

/** The human_category values a paper-track persona can be routed to. */
const VALID_CATEGORIES = [
  "AI & Robots",
  "Your Health",
  "Your Money",
  "Your Food",
  "Climate",
];

/**
 * Stable hash of the persona fields that decide the track. Language is
 * excluded on purpose — the track (paper vs general + categories) is the
 * same regardless of the UI language.
 */
export function personaHash(profile: Profile): string {
  const basis = [profile.occupation, profile.interests]
    .map((s) => (s ?? "").trim().toLowerCase())
    .join("|");
  let h = 0;
  for (let i = 0; i < basis.length; i++) {
    h = (h * 31 + basis.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/** Pull the first balanced-looking JSON object out of a model reply. */
function extractJson<T>(raw: string): T | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

function coerceTrack(value: unknown): FactKind | null {
  return value === "paper" || value === "general" ? value : null;
}

function coerceCategories(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    const s = String(item).trim();
    if (VALID_CATEGORIES.includes(s)) seen.add(s);
  }
  return Array.from(seen);
}

// Phase 1 policy: only the 5 paper categories above have real-time research
// coverage (arXiv + OpenAlex). Personas those categories can't serve — e.g.
// 律师 (lawyer) and 建筑工人 (construction worker) — stay on the "general"
// (Wikipedia-grounded) track until Phase 2 adds their premium sources.
const SYSTEM_PROMPT = [
  "You route a person to the right daily-content track for KnowTok.",
  "Two tracks exist:",
  '- "paper": frontier research summaries, only in these categories: "AI & Robots", "Your Health", "Your Money", "Your Food", "Climate".',
  '- "general": broad, verified general knowledge, for people whom research in those categories does not personally serve.',
  "",
  "Pick \"paper\" ONLY when recent research in one or more of those categories is genuinely, personally relevant to this person's work.",
  "Examples: a software engineer → paper / [\"AI & Robots\"]; a doctor → paper / [\"Your Health\"]; a financial analyst → paper / [\"Your Money\"]; a lawyer → general / []; a construction worker → general / []; a chef → general / [] (unless nutrition science clearly fits → paper / [\"Your Food\"]).",
  "",
  'Return STRICT JSON only, no prose: {"track":"paper"|"general","categories":[<subset of the 5 categories, [] for general>]}.',
].join("\n");

function buildUserPrompt(profile: Profile): string {
  return [
    `Occupation: ${profile.occupation || "(unknown)"}`,
    `Interests: ${profile.interests || "(none given)"}`,
    "",
    "Classify this person. Return the JSON only.",
  ].join("\n");
}

async function classify(profile: Profile): Promise<PersonaTrack> {
  const hash = personaHash(profile);
  const apiKey = profile.apiKey?.trim() || ENV_API_KEY;

  const attempt = async (): Promise<PersonaTrack | null> => {
    const raw = await generateText({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(profile),
      apiKey,
      maxTokens: 150,
      timeoutMs: 45_000,
    });
    const parsed = extractJson<{ track?: unknown; categories?: unknown }>(raw);
    if (!parsed) return null;
    const track = coerceTrack(parsed.track);
    if (!track) return null;
    const categories = track === "paper" ? coerceCategories(parsed.categories) : [];
    return { personaHash: hash, track, categories };
  };

  try {
    const first = await attempt();
    if (first) return first;
  } catch (err) {
    console.warn("persona track classify failed (attempt 1):", err);
  }

  try {
    const second = await attempt();
    if (second) return second;
  } catch (err) {
    console.warn("persona track classify failed (attempt 2):", err);
  }

  // Safe default: keep everyone on the paper track with no category filter.
  return { personaHash: hash, track: "paper", categories: [] };
}

/**
 * Resolve the content track for a persona, memoized in AsyncStorage keyed by
 * personaHash so the classifier LLM runs at most once per distinct persona.
 */
export async function getPersonaTrack(profile: Profile): Promise<PersonaTrack> {
  const hash = personaHash(profile);
  const cacheKey = `${CACHE_PREFIX}${hash}`;

  const cachedRaw = await AsyncStorage.getItem(cacheKey);
  if (cachedRaw) {
    try {
      const cached = JSON.parse(cachedRaw) as PersonaTrack;
      if (cached.personaHash === hash && (cached.track === "paper" || cached.track === "general")) {
        return cached;
      }
    } catch {
      // fall through to re-classify
    }
  }

  const resolved = await classify(profile);
  await AsyncStorage.setItem(cacheKey, JSON.stringify(resolved));
  return resolved;
}
