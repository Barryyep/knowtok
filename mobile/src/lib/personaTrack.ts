import AsyncStorage from "@react-native-async-storage/async-storage";

import { ENV_API_KEY } from "./config";
import { generateText } from "./goodvision";
import { extractJson } from "./jsonUtils";
import { interestsForPrompt, occupationForPrompt } from "./onboarding";
import { domainsToCategories } from "./paperService";
import { domainById } from "./taxonomy";
import type { AppLanguage, FactKind, PersonaTrack, Profile } from "./types";

const CACHE_PREFIX = "ohlo:personaTrack:v1:";

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
 * same regardless of the UI language. curiosityDomains ARE included: they now
 * drive routing directly, so a change to them must invalidate the cache.
 */
export function personaHash(profile: Profile): string {
  const basis = [
    profile.occupation, // raw stored value — hash must differ when the id itself changes
    profile.interests,
    (profile.curiosityDomains ?? []).slice().sort().join(","),
  ]
    .map((s) => (s ?? "").trim().toLowerCase())
    .join("|");
  let h = 0;
  for (let i = 0; i < basis.length; i++) {
    h = (h * 31 + basis.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/** The user's selected domain ids that exist in the taxonomy. */
function selectedDomainIds(profile: Profile): string[] {
  return (profile.curiosityDomains ?? []).filter((id) => domainById(id));
}

/**
 * Selected domains as {zh, en} labels — grounding seeds for the wiki/general
 * track. Empty for legacy users with no declared curiosity domains.
 */
export function getWikiDomains(profile: Profile): Array<{ id: string; zh: string; en: string }> {
  return selectedDomainIds(profile).map((id) => {
    const d = domainById(id)!;
    return { id: d.id, zh: d.zh, en: d.en };
  });
}

/** Domain label in the user's language (grounding seed for generalFact). */
export function domainLabelFor(domainId: string, language: AppLanguage): string | undefined {
  const d = domainById(domainId);
  return d ? d[language] : undefined;
}

/**
 * Build the track directly from the taxonomy — no LLM — for a user who has
 * declared curiosity domains. track='paper' if ANY selected domain can be
 * served by papers; categories = the human_category values those paper-capable
 * domains map to.
 */
function trackFromDomains(profile: Profile): PersonaTrack | null {
  const selected = selectedDomainIds(profile);
  if (selected.length === 0) return null;
  const paperDomains = selected.filter((id) => domainById(id)!.sources.includes("papers"));
  const track: FactKind = paperDomains.length > 0 ? "paper" : "general";
  const categories = track === "paper" ? domainsToCategories(paperDomains) : [];
  return { personaHash: personaHash(profile), track, categories };
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
  "You route a person to the right daily-content track for Ohlo.",
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
    `Occupation: ${profile.occupation ? occupationForPrompt(profile.occupation) : "(unknown)"}`,
    `Interests: ${profile.interests ? interestsForPrompt(profile.interests) : "(none given)"}`,
    "",
    "Classify this person. Return the JSON only.",
  ].join("\n");
}

/**
 * Classify a persona into a track. Returns null when both LLM attempts fail —
 * the caller substitutes a safe default WITHOUT caching it, so the next call
 * re-attempts rather than serving a wrong fallback forever.
 */
async function classify(profile: Profile): Promise<PersonaTrack | null> {
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

  // Classification failed — signal the caller so it does NOT persist a guess.
  return null;
}

/**
 * Resolve the content track for a persona, memoized in AsyncStorage keyed by
 * personaHash so the classifier LLM runs at most once per distinct persona.
 */
export async function getPersonaTrack(profile: Profile): Promise<PersonaTrack> {
  // Declared curiosity domains drive routing directly — skip the LLM entirely.
  const fromDomains = trackFromDomains(profile);
  if (fromDomains) return fromDomains;

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
  if (resolved) {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(resolved));
    return resolved;
  }

  // Classification failed: serve a safe default (paper track, no filter) but do
  // NOT cache it, so the next call re-attempts once the LLM is reachable again.
  return { personaHash: hash, track: "paper", categories: [] };
}
