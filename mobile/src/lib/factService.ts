import { ENV_API_KEY } from "./config";
import { generateGeneralFact } from "./generalFactService";
import { generateText } from "./goodvision";
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
  if (cached && cached.date === today && !forceRefresh) {
    return cached;
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? "anon";

  const history = await loadFactHistory();
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
 * Generate + persist a general-track fact for today, avoiding recently shown
 * topics. Falls back to the cached fact if generation fails.
 */
async function buildGeneralFact(
  profile: Profile,
  today: string,
  history: DailyFact[],
  cached: DailyFact | null,
  forceRefresh: boolean,
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
    const fact = await generateGeneralFact(profile, today, recentFacts);
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
