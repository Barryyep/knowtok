import type { AnthropicMessagesRequest, LlmProvider, ProviderResult } from "./types";

/**
 * Direct Anthropic provider — talks to api.anthropic.com/v1/messages.
 *
 * Wire format is identical to goodvision (both speak Anthropic Messages);
 * only the endpoint and the key env var differ. Kept as its own module so the
 * endpoint/key can be configured independently of the goodvision gateway.
 */
export function createAnthropicProvider(): LlmProvider {
  return {
    name: "anthropic",
    endpoint: process.env.ANTHROPIC_URL ?? "https://api.anthropic.com/v1/messages",

    buildHeaders(apiKey: string): Record<string, string> {
      return {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      };
    },

    // Verbatim: canonical format === Anthropic format.
    buildBody(req: AnthropicMessagesRequest): unknown {
      return req;
    },

    // Verbatim: Anthropic returns the Anthropic Messages shape.
    parseResponse(status: number, json: unknown): ProviderResult {
      return { status, body: json };
    },
  };
}
