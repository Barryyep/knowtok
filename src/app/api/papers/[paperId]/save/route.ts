import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, jsonError } from "@/lib/http";
import { getAuthedClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  saved: z.boolean(),
});

export async function POST(
  request: Request,
  context: {
    params: Promise<{ paperId: string }>;
  },
) {
  try {
    const { client, user } = await getAuthedClient(request);
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid save payload");
    }

    const { paperId } = await context.params;

    if (parsed.data.saved) {
      const { error } = await client.from("user_saved_papers").upsert(
        {
          user_id: user.id,
          paper_id: paperId,
        },
        { onConflict: "user_id,paper_id" },
      );

      if (error) {
        throw error;
      }
    } else {
      const { error } = await client
        .from("user_saved_papers")
        .delete()
        .eq("user_id", user.id)
        .eq("paper_id", paperId);

      if (error) {
        throw error;
      }
    }

    await client.from("user_events").insert({
      user_id: user.id,
      paper_id: paperId,
      event_type: "save",
      metadata: {
        saved: parsed.data.saved,
      },
    });

    return NextResponse.json({ saved: parsed.data.saved });
  } catch (error) {
    return jsonError(error, "Failed to update save status");
  }
}
