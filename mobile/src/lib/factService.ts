import { ENV_API_KEY } from "./config";
import { generateGeneralFact } from "./generalFactService";
import { generateText } from "./goodvision";
import { hashStringToNumber } from "./jsonUtils";
import { fetchCandidatePapers, paperToFact, pickDailyPaper } from "./paperService";
import { getPersonaTrack } from "./personaTrack";
import { buildWhyCarePrompt, cleanWhyCare } from "./prompt";
import {
  loadFactHistory,
  loadStoredFact,
  saveFact,
  updateStoredWhyCare,
} from "./storage";
import { supabase } from "./supabase";
import { domainById } from "./taxonomy";
import type { DailyFact, Profile } from "./types";

/** Local (not UTC) calendar date, so the fact rolls over at the user's midnight. */
export function localDateString(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function resolveApiKey(profile: Profile): string {
  return profile.apiKey?.trim() || ENV_API_KEY;
}

/**
 * Fast path: the fact itself is a real paper from Supabase (sub-second),
 * so the card renders immediately. The LLM only writes the personalized
 * "why you'd care" line, which arrives async via generateWhyCare — the
 * UI must not block on it.
 */
export async function getTodayFact(
  profile: Profile,
  { forceRefresh = false } = {},
): Promise<DailyFact> {
  const today = localDateString();
  const cached = await loadStoredFact();
  // A cached fact is only fresh when it matches today's date AND language.
  // A legacy fact without a language field (undefined) won't match, triggering
  // one regeneration — acceptable and correct per spec.
  if (cached && cached.date === today && !forceRefresh && cached.language === profile.language) {
    return cached;
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? "anon";

  const history = await loadFactHistory();

  // v2: declared curiosity domains drive a per-day rotation across the user's
  // selected domains. Legacy users (no domains) fall back to LLM classification.
  const selectedDomains = (profile.curiosityDomains ?? []).filter((id) => domainById(id));
  if (selectedDomains.length > 0) {
    return buildDomainRotatedFact(profile, today, userId, selectedDomains, history, cached, forceRefresh);
  }

  const track = await getPersonaTrack(profile);

  // General track: personas that research can't serve get an LLM-tailored,
  // verifiable general-knowledge fact instead of a paper.
  if (track.track === "general") {
    return buildGeneralFact(profile, today, history, cached, forceRefresh);
  }

  const papers = await fetchCandidatePapers(profile.language, track.categories);
  // No papers in this persona's categories → fall back to a general fact
  // rather than showing an off-topic paper.
  if (papers.length === 0) {
    return buildGeneralFact(profile, today, history, cached, forceRefresh);
  }

  // Exclude recently shown facts; on manual refresh also exclude the
  // current one so "换一条" always changes the card.
  const excludeIds = history.map((f) => f.source.factId);
  if (forceRefresh && cached) excludeIds.push(cached.source.factId);

  const paper = pickDailyPaper(papers, userId, today + (forceRefresh ? `:${excludeIds.length}` : ""), excludeIds);
  if (!paper) {
    if (cached) return cached;
    throw new Error("No papers available — check your connection and try again.");
  }

  const fact = paperToFact(paper, profile.language, today);
  await saveFact(fact);
  return fact;
}

/**
 * Weighted domain pick — maps hash into cumulative-weight buckets so domains
 * with higher weight are selected proportionally more often. Falls back to
 * uniform modulo when weights are missing or sum to zero.
 *
 * hash → [0, 1) via (hash % 100_000) / 100_000, then scaled into [0, total).
 * Walking the cumulative-weight list gives a deterministic domain index.
 */
function weightedDomainPick(
  hash: number,
  domains: string[],
  weights: Record<string, number> | undefined,
): number {
  if (domains.length === 0) return 0;
  if (!weights) return hash % domains.length;
  const ws = domains.map((id) => Math.max(weights[id] ?? 0, 0));
  const total = ws.reduce((a, b) => a + b, 0);
  if (total <= 0) return hash % domains.length;
  const target = ((hash % 100_000) / 100_000) * total;
  let cumulative = 0;
  for (let i = 0; i < ws.length; i++) {
    cumulative += ws[i];
    if (target < cumulative) return i;
  }
  return ws.length - 1;
}

/**
 * Domain-rotation path (v2). Deterministically pick the day's domain from the
 * user's selected curiosity domains; a paper-capable domain WITH papers uses
 * the paper flow scoped to that domain, otherwise the general flow is seeded
 * with the domain so the wiki grounding stays on-topic. "换一条" (forceRefresh)
 * rotates to another domain when more than one is selected.
 */
async function buildDomainRotatedFact(
  profile: Profile,
  today: string,
  userId: string,
  selectedDomains: string[],
  history: DailyFact[],
  cached: DailyFact | null,
  forceRefresh: boolean,
): Promise<DailyFact> {
  const excludeIds = history.map((f) => f.source.factId);
  if (forceRefresh && cached) excludeIds.push(cached.source.factId);

  // Stable domain for (user, date); on refresh advance so the topic changes.
  const rotation = forceRefresh ? Math.max(1, excludeIds.length) : 0;
  const hash = hashStringToNumber(`${userId}:${today}`) + rotation;
  const dayIndex = weightedDomainPick(hash, selectedDomains, profile.domainWeights);
  const domainId = selectedDomains[dayIndex];
  const domain = domainById(domainId)!;
  const focusDomain = domain[profile.language];

  // Paper-capable domain (papers or owid backed) with rows → paper flow scoped to that domain.
  if (domain.sources.includes("papers") || domain.sources.includes("owid")) {
    const papers = await fetchCandidatePapers(profile.language, [domainId]);
    if (papers.length > 0) {
      const paper = pickDailyPaper(
        papers,
        userId,
        today + (forceRefresh ? `:${excludeIds.length}` : "") + `:${domainId}`,
        excludeIds,
      );
      if (paper) {
        const fact = paperToFact(paper, profile.language, today);
        await saveFact(fact);
        return fact;
      }
    }
  }

  // Otherwise a general fact seeded with the day's domain.
  return buildGeneralFact(profile, today, history, cached, forceRefresh, focusDomain);
}

/**
 * Generate + persist a general-track fact for today, avoiding recently shown
 * topics. Falls back to the cached fact if generation fails.
 */
async function buildGeneralFact(
  profile: Profile,
  today: string,
  history: DailyFact[],
  cached: DailyFact | null,
  forceRefresh: boolean,
  focusDomain?: string,
): Promise<DailyFact> {
  // Without a key, generateGeneralFact would throw deep inside generateText.
  // Keep the cached fact instead of surfacing that failure to the UI.
  if (!resolveApiKey(profile) && cached) {
    console.warn("general track: no goodvision key — keeping cached fact");
    return cached;
  }

  const recentFacts = history.map((f) => f.topic).filter(Boolean);
  if (forceRefresh && cached) {
    recentFacts.unshift(cached.topic, cached.fact);
  }
  try {
    const fact = await generateGeneralFact(profile, today, recentFacts, focusDomain);
    await saveFact(fact);
    return fact;
  } catch (err) {
    console.warn("general fact generation failed:", err);
    if (cached) return cached;
    throw err;
  }
}

/**
 * Generate the personalized whyCare line for a fact. Returns the updated
 * fact; persists + re-syncs widgets. Never throws — a missing whyCare
 * just leaves that section hidden.
 */
export async function generateWhyCare(profile: Profile, fact: DailyFact): Promise<DailyFact> {
  if (fact.whyCare) return fact;
  try {
    const { system, user } = buildWhyCarePrompt(profile, fact);
    const raw = await generateText({
      system,
      user,
      apiKey: resolveApiKey(profile),
      maxTokens: 200,
      timeoutMs: 45_000,
    });
    const whyCare = cleanWhyCare(raw);
    if (!whyCare) return fact;
    const updated = { ...fact, whyCare };
    await updateStoredWhyCare(updated);
    return updated;
  } catch (err) {
    console.warn("whyCare generation failed:", err);
    return fact;
  }
}

/**
 * Widget-safe variant: never throws, requires an existing session.
 * Used by the Android widget task handler for midnight rollover.
 */
export async function getTodayFactSafe(profile: Profile | null): Promise<DailyFact | null> {
  const cached = await loadStoredFact();
  if (!profile) return cached;
  try {
    return await getTodayFact(profile);
  } catch {
    return cached;
  }
}
