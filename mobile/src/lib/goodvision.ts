import { GOODVISION_BASE_URL, GOODVISION_MODEL } from "./config";

interface MessagesRequest {
  system: string;
  user: string;
  apiKey: string;
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
 * The gateway kills idle sockets on long generations, but a ~200-token fact
 * completes well within the timeout, so streaming isn't needed in V1.
 */
export async function generateText({
  system,
  user,
  apiKey,
  maxTokens = 600,
  timeoutMs = 90_000,
  model,
}: MessagesRequest): Promise<string> {
  if (!apiKey) {
    throw new GoodvisionError(
      "Missing goodvision API key. Set EXPO_PUBLIC_GOODVISION_API_KEY or enter one in the profile screen.",
    );
  }

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
