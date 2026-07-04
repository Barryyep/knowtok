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
    .select("job_title, interests, language, manual_notes")
    .eq("user_id", uid)
    .maybeSingle();
  if (error || !data) return null;
  return {
    name: "",
    occupation: data.job_title ?? "",
    interests: (data.interests ?? []).join(", "),
    language: data.language === "en" ? "en" : "zh",
  };
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
