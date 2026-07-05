import type { AnthropicMessagesRequest, LlmProvider, ProviderResult } from "./types";

/**
 * goodvision provider — an Anthropic-compatible gateway (Bedrock-backed).
 *
 * This is a pure passthrough: the canonical Anthropic Messages format IS the
 * upstream format, so headers, body, and response are all verbatim. This is
 * the historical (default) behavior of the proxy and MUST stay byte-identical.
 */
export function createGoodvisionProvider(): LlmProvider {
  return {
    name: "goodvision",
    endpoint: process.env.GOODVISION_URL ?? "https://api.goodvision.tech/v1/messages",

    buildHeaders(apiKey: string): Record<string, string> {
      return {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      };
    },

    // Verbatim: the app already speaks this dialect.
    buildBody(req: AnthropicMessagesRequest): unknown {
      return req;
    },

    // Verbatim: upstream already returns the Anthropic Messages shape.
    parseResponse(status: number, json: unknown): ProviderResult {
      return { status, body: json };
    },
  };
}
