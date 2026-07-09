import { supabase } from "./supabase";
import { saveProfile } from "./storage";
import type { AppLanguage, Profile } from "./types";

/**
 * user_personas is the same profile table the web app uses; RLS scopes
 * rows to auth.uid(). The mobile Profile is a flat mirror of the subset
 * we need (job_title, interests, language).
 */
export async function fetchRemotePersona(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("user_personas")
    .select("job_title, interests, language, manual_notes, curiosity_tags, age_range, domain_weights")
    .eq("user_id", uid)
    .maybeSingle();
  if (error || !data) return null;
  return {
    name: "",
    occupation: data.job_title ?? "",
    interests: (data.interests ?? []).join(", "),
    curiosityDomains: data.curiosity_tags ?? [],
    ageRange: data.age_range ?? undefined,
    domainWeights: shapeDomainWeights(data.domain_weights),
    language: data.language === "en" ? "en" : "zh",
  };
}

/**
 * Shape a raw `user_personas.domain_weights` JSONB value into
 * Profile.domainWeights. Pure so it's testable without Supabase — see
 * mobile/src/lib/__tests__/personaService.test.ts. Returns undefined for an
 * empty/absent map (matches the optional field, and lets callers fall back
 * to a locally-persisted value instead of overwriting it with `{}`).
 */
export function shapeDomainWeights(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const entries = Object.entries(raw as Record<string, unknown>).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number",
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

export async function saveRemotePersona(profile: Profile): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not signed in");

  const interests = profile.interests
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const { error } = await supabase.from("user_personas").upsert({
    user_id: userId,
    job_title: profile.occupation || null,
    interests,
    curiosity_tags: profile.curiosityDomains ?? [],
    age_range: profile.ageRange ?? null,
    domain_weights: profile.domainWeights ?? {},
    language: profile.language,
    profile_source: "manual",
  });
  if (error) throw new Error(`persona save failed: ${error.message}`);
}

/** Persist locally + remotely (remote failure doesn't block the app). */
export async function savePersonaEverywhere(profile: Profile): Promise<void> {
  await saveProfile(profile);
  try {
    await saveRemotePersona(profile);
  } catch (err) {
    console.warn("remote persona sync failed:", err);
  }
}
