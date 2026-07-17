import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { createServiceRoleClient, getAuthedClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * In-app account deletion (App Review Guideline 5.1.1(v)).
 *
 * The caller proves ownership with their own Supabase access token; the
 * actual deletion needs the service-role key (auth.admin), so it runs
 * server-side. Deleting the auth.users row cascades to every user-scoped
 * table (user_personas, user_events, saved_papers, … — all declare
 * ON DELETE CASCADE in 20260322_003_fresh_start.sql), so one call wipes
 * the account and all associated data.
 */
export async function POST(request: Request) {
  try {
    // Only the account's own bearer token can delete it — the user id comes
    // from the verified token, never from the request body.
    const { user } = await getAuthedClient(request);

    const admin = createServiceRoleClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`[account/delete] ${user.id.slice(0, 8)}…: ${error.message}`);
      return NextResponse.json({ error: "Account deletion failed" }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return jsonError(error, "Account deletion error");
  }
}
