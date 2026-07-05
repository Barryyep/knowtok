import { GOODVISION_BASE_URL, GOODVISION_MODEL, ENV_API_KEY } from "./config";
import { supabase } from "./supabase";

/** Server-side proxy URL — never exposes the upstream key in the app bundle. */
const PROXY_URL = "https://ohlo.app/api/llm";

interface MessagesRequest {
  system: string;
  user: string;
  /** Ignored in production proxy path; retained for call-site compatibility. */
  apiKey?: string;
  maxTokens?: number;
  /** Total request timeout. Facts are short; 90s is generous. */
  timeoutMs?: number;
  /** Override the model for this request (defaults to GOODVISION_MODEL). */
  model?: string;
}

interface AnthropicTextBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content?: AnthropicTextBlock[];
  error?: { type?: string; message?: string };
}

export class GoodvisionError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GoodvisionError";
  }
}

/**
 * Single-turn, non-streaming call to the Anthropic-compatible Messages API.
 *
 * Routing:
 *   DEV build + EXPO_PUBLIC_GOODVISION_API_KEY set → call goodvision directly
 *     (local simulator/dev work doesn't depend on prod proxy).
 *   All other cases → POST https://ohlo.app/api/llm with the user's supabase
 *     access token (Authorization: Bearer).
 *   No session and no dev key → throws GoodvisionError (missing credentials).
 */
export async function generateText({
  system,
  user,
  maxTokens = 600,
  timeoutMs = 90_000,
  model,
}: MessagesRequest): Promise<string> {
  // ── DEV direct-call fallback ─────────────────────────────────────────────
  // __DEV__ is injected by Metro/Expo at build time; always false in production.
  // Access via globalThis to stay type-safe in non-RN TypeScript contexts.
  const isDev = Boolean((globalThis as Record<string, unknown>).__DEV__);
  if (isDev && ENV_API_KEY) {
    return callGoodvisionDirect({
      system,
      user,
      apiKey: ENV_API_KEY,
      maxTokens,
      timeoutMs,
      model,
    });
  }

  // ── Production (and DEV without key): proxy via server ───────────────────
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new GoodvisionError(
      "Missing goodvision API key. Set EXPO_PUBLIC_GOODVISION_API_KEY or enter one in the profile screen.",
    );
  }

  return callProxy({
    system,
    user,
    accessToken: session.access_token,
    maxTokens,
    timeoutMs,
    model,
  });
}

// ── Internal helpers ────────────────────────────────────────────────────────

interface DirectCallOptions {
  system: string;
  user: string;
  apiKey: string;
  maxTokens: number;
  timeoutMs: number;
  model?: string;
}

async function callGoodvisionDirect({
  system,
  user,
  apiKey,
  maxTokens,
  timeoutMs,
  model,
}: DirectCallOptions): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${GOODVISION_BASE_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model ?? GOODVISION_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new GoodvisionError(`goodvision request timed out after ${timeoutMs}ms`);
    }
    throw new GoodvisionError(
      `goodvision request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  return parseAnthropicResponse(res);
}

interface ProxyCallOptions {
  system: string;
  user: string;
  accessToken: string;
  maxTokens: number;
  timeoutMs: number;
  model?: string;
}

async function callProxy({
  system,
  user,
  accessToken,
  maxTokens,
  timeoutMs,
  model,
}: ProxyCallOptions): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model ?? GOODVISION_MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new GoodvisionError(`goodvision request timed out after ${timeoutMs}ms`);
    }
    throw new GoodvisionError(
      `goodvision request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  return parseAnthropicResponse(res);
}

async function parseAnthropicResponse(res: Response): Promise<string> {
  const bodyText = await res.text();
  if (!res.ok) {
    throw new GoodvisionError(
      `goodvision HTTP ${res.status}: ${bodyText.slice(0, 300)}`,
      res.status,
    );
  }

  let parsed: AnthropicResponse;
  try {
    parsed = JSON.parse(bodyText) as AnthropicResponse;
  } catch {
    throw new GoodvisionError(`goodvision returned non-JSON body: ${bodyText.slice(0, 300)}`);
  }

  if (parsed.error) {
    throw new GoodvisionError(parsed.error.message ?? "upstream API error");
  }

  const text = parsed.content
    ?.filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("");

  if (!text) {
    throw new GoodvisionError(
      `goodvision response had no text content: ${bodyText.slice(0, 300)}`,
    );
  }
  return text;
}
