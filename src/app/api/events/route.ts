import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, jsonError } from "@/lib/http";
import { getAuthedClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  paperId: z.string().uuid(),
  eventType: z.enum(["view", "skip", "save", "impact_click", "impact_refresh"]),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const { client, user } = await getAuthedClient(request);
    const parsed = bodySchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest("Invalid event payload");
    }

    const { error } = await client.from("user_events").insert({
      user_id: user.id,
      paper_id: parsed.data.paperId,
      event_type: parsed.data.eventType,
      metadata: parsed.data.metadata ?? {},
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, "Failed to record event");
  }
}
