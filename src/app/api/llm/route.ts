import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getAuthedClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const GOODVISION_URL = "https://api.goodvision.tech/v1/messages";
const ALLOWED_MODELS = new Set(["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"]);
const MAX_TOKENS_LIMIT = 4096;
const TIMEOUT_MS = 25_000;

// TODO: per-user rate limit (tracked separately)

export async function POST(request: Request) {
  try {
    // Validates Authorization: Bearer <supabase access token>; throws UnauthorizedError if invalid.
    await getAuthedClient(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
    }

    const { model, max_tokens, ...rest } = body as Record<string, unknown>;

    // Model allowlist
    const resolvedModel = typeof model === "string" ? model : "claude-sonnet-4-6";
    if (!ALLOWED_MODELS.has(resolvedModel)) {
      return NextResponse.json(
        {
          error: `Model '${resolvedModel}' not allowed. Allowed: ${[...ALLOWED_MODELS].join(", ")}`,
        },
        { status: 400 },
      );
    }

    // max_tokens cap
    const resolvedMaxTokens = typeof max_tokens === "number" ? max_tokens : 1024;
    if (resolvedMaxTokens > MAX_TOKENS_LIMIT) {
      return NextResponse.json(
        { error: `max_tokens ${resolvedMaxTokens} exceeds limit of ${MAX_TOKENS_LIMIT}` },
        { status: 400 },
      );
    }

    const apiKey = process.env.GOODVISION_API_KEY;
    if (!apiKey) {
      console.error("[llm] GOODVISION_API_KEY is not set");
      return NextResponse.json({ error: "LLM service not configured" }, { status: 503 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let upstream: Response;
    try {
      upstream = await fetch(GOODVISION_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: resolvedModel,
          max_tokens: resolvedMaxTokens,
          ...rest,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) {
        return NextResponse.json({ error: "LLM request timed out" }, { status: 504 });
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }

    const upstreamBody = await upstream.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(upstreamBody);
    } catch {
      return NextResponse.json(
        { error: `Upstream returned non-JSON: ${upstreamBody.slice(0, 300)}` },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed, { status: upstream.status });
  } catch (error) {
    return jsonError(error, "LLM proxy error");
  }
}
