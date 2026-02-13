import { NextResponse } from "next/server";
import { z } from "zod";
import { getIngestSecret } from "@/lib/env";
import { runIngestPipeline } from "@/lib/ingest";
import { badRequest, jsonError } from "@/lib/http";

export const runtime = "nodejs";

const bodySchema = z.object({
  mode: z.enum(["daily", "backfill"]).default("daily"),
  days: z.number().int().min(1).max(90).optional(),
});

export async function POST(request: Request) {
  try {
    const incomingSecret = request.headers.get("x-ingest-secret");
    if (!incomingSecret || incomingSecret !== getIngestSecret()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message || "Invalid ingest payload");
    }

    const result = await runIngestPipeline({
      mode: parsed.data.mode,
      days: parsed.data.days,
      triggeredBy: "cron",
    });

    return NextResponse.json(result, {
      status: result.status === "failed" ? 500 : 200,
    });
  } catch (error) {
    return jsonError(error, "Failed to run ingest pipeline");
  }
}
