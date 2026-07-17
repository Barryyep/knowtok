import { clearLocalData } from "./storage";
import { supabase } from "./supabase";

/** Server endpoint that performs the actual auth.admin deletion — the anon
 * key can't delete users, so it must go through our API (same host as the
 * LLM proxy in goodvision.ts). */
const DELETE_URL = "https://ohlo.app/api/account/delete";

/**
 * Permanently delete the signed-in account (App Review 5.1.1(v)).
 * Server side deletes the auth user, which cascades to user_personas,
 * user_events, and every other user-scoped table. On success, local
 * caches are wiped and the session is dropped locally (the server-side
 * session died with the user, so scope:"local" avoids a doomed network
 * round-trip). Throws on failure — callers surface the error.
 */
export async function deleteAccount(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not signed in");

  const res = await fetch(DELETE_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`delete failed (HTTP ${res.status}): ${body.slice(0, 200)}`);
  }

  await clearLocalData();
  await supabase.auth.signOut({ scope: "local" });
}
