/**
 * Provider abstraction for the server-side LLM proxy.
 *
 * The canonical wire format flowing IN and OUT of the API route is the
 * Anthropic Messages shape — that is the only dialect the mobile app speaks
 * ({ model, max_tokens, system, messages } in, { content: [{ type, text }], ... } out).
 *
 * A provider's job is to translate that canonical shape to/from whatever the
 * selected upstream endpoint actually expects, so switching endpoints
 * (goodvision / OpenAI / Anthropic-direct) is a config change, not a code change.
 */

/** Anthropic Messages request body, as received (and validated) by the route. */
export interface AnthropicMessagesRequest {
  /** Anthropic model id (already allowlist-validated by the route). */
  model: string;
  /** Already token-capped by the route. */
  max_tokens: number;
  /** System prompt (optional in the Anthropic API). */
  system?: string;
  /** Chat turns. `content` may be a plain string or Anthropic content blocks. */
  messages?: Array<{ role: string; content: unknown }>;
  /** Any additional Anthropic passthrough fields (temperature, stop_sequences, …). */
  [key: string]: unknown;
}

/** What the route should return to the client: an HTTP status + JSON body. */
export interface ProviderResult {
  status: number;
  body: unknown;
}

export interface LlmProvider {
  /** Stable identifier, e.g. "goodvision" | "anthropic" | "openai". */
  name: string;
  /** Upstream URL to POST to. Resolved from env at construction time. */
  endpoint: string;
  /** Auth + protocol headers for the upstream request. */
  buildHeaders(apiKey: string): Record<string, string>;
  /** Translate the canonical Anthropic request into the upstream body. */
  buildBody(req: AnthropicMessagesRequest): unknown;
  /**
   * Translate the (already JSON-parsed) upstream response back into the
   * canonical Anthropic Messages shape the mobile client expects.
   * `status` is the upstream HTTP status; return it (or a mapped one) verbatim.
   */
  parseResponse(status: number, json: unknown): ProviderResult;
}
