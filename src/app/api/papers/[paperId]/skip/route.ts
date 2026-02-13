import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getAuthedClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  context: {
    params: Promise<{ paperId: string }>;
  },
) {
  try {
    const { client, user } = await getAuthedClient(request);
    const { paperId } = await context.params;

    const { error } = await client.from("user_events").insert({
      user_id: user.id,
      paper_id: paperId,
      event_type: "skip",
      metadata: {
        hiddenForDays: 30,
      },
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      skipped: true,
      hiddenUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    return jsonError(error, "Failed to skip paper");
  }
}
