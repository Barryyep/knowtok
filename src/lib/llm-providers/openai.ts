import type { AnthropicMessagesRequest, LlmProvider, ProviderResult } from "./types";

/**
 * OpenAI Chat Completions adapter.
 *
 * Translates the canonical Anthropic Messages format to OpenAI's
 * /v1/chat/completions dialect on the way out, and maps the response back to
 * the Anthropic Messages shape on the way in — so the mobile client, which
 * only ever speaks Anthropic Messages, is completely unchanged.
 *
 * ── Request mapping (Anthropic → OpenAI) ───────────────────────────────────
 *   system                → messages[0] = { role: "system", content: system }
 *   messages[]            → appended after the system message (verbatim)
 *   max_tokens            → max_tokens OR max_completion_tokens (env-selected)
 *   model (anthropic id)  → mapped via OPENAI_MODEL_MAP (see MODEL_MAP defaults)
 *
 * ── Response mapping (OpenAI → Anthropic) ──────────────────────────────────
 *   choices[0].message.content  → content: [{ type: "text", text }]
 *   choices[0].finish_reason    → stop_reason (mapped, see FINISH_REASON_MAP)
 *   usage.prompt_tokens         → usage.input_tokens
 *   usage.completion_tokens     → usage.output_tokens
 *
 * ── Lossy notes ────────────────────────────────────────────────────────────
 *   • Anthropic `content` blocks (arrays of {type,text,...}) are passed to
 *     OpenAI verbatim. The mobile app sends plain-string content, which OpenAI
 *     accepts, so the common path is lossless. Rich Anthropic block types
 *     (images, tool_use, etc.) are NOT translated and may be rejected upstream.
 *   • Only the first OpenAI choice is surfaced; n>1 is not supported.
 *   • Anthropic-specific fields (stop_sequences, top_k, metadata, …) are
 *     dropped since OpenAI has no equivalent or different semantics.
 */

/** Sane Anthropic-id → OpenAI-id defaults; override via OPENAI_MODEL_MAP (JSON). */
const DEFAULT_MODEL_MAP: Record<string, string> = {
  "claude-opus-4-8": "gpt-4o",
  "claude-sonnet-4-6": "gpt-4o",
  "claude-haiku-4-5": "gpt-4o-mini",
};

/** Fallback OpenAI model when the incoming model id isn't in the map. */
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_DEFAULT_MODEL ?? "gpt-4o";

/** OpenAI finish_reason → Anthropic stop_reason. */
const FINISH_REASON_MAP: Record<string, string> = {
  stop: "end_turn",
  length: "max_tokens",
  content_filter: "stop_sequence",
  tool_calls: "tool_use",
  function_call: "tool_use",
};

function resolveModelMap(): Record<string, string> {
  const raw = process.env.OPENAI_MODEL_MAP;
  if (!raw) return DEFAULT_MODEL_MAP;
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    // Env map takes precedence, defaults fill the gaps.
    return { ...DEFAULT_MODEL_MAP, ...parsed };
  } catch {
    console.error("[llm] OPENAI_MODEL_MAP is not valid JSON; using defaults");
    return DEFAULT_MODEL_MAP;
  }
}

export function createOpenaiProvider(): LlmProvider {
  return {
    name: "openai",
    endpoint: process.env.OPENAI_URL ?? "https://api.openai.com/v1/chat/completions",

    buildHeaders(apiKey: string): Record<string, string> {
      return {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      };
    },

    buildBody(req: AnthropicMessagesRequest): unknown {
      const modelMap = resolveModelMap();
      const model = modelMap[req.model] ?? DEFAULT_OPENAI_MODEL;

      const messages: Array<{ role: string; content: unknown }> = [];
      if (typeof req.system === "string" && req.system.length > 0) {
        messages.push({ role: "system", content: req.system });
      }
      if (Array.isArray(req.messages)) {
        messages.push(...req.messages);
      }

      // Newer OpenAI models require `max_completion_tokens`; older ones use
      // `max_tokens`. Selectable via env so this is a config change, not code.
      const tokenField =
        process.env.OPENAI_MAX_TOKENS_FIELD === "max_completion_tokens"
          ? "max_completion_tokens"
          : "max_tokens";

      return {
        model,
        messages,
        [tokenField]: req.max_tokens,
      };
    },

    parseResponse(status: number, json: unknown): ProviderResult {
      const j = (json ?? {}) as {
        id?: string;
        model?: string;
        error?: unknown;
        choices?: Array<{
          message?: { content?: unknown };
          finish_reason?: string;
        }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      // Error / non-2xx: surface the upstream body + status unchanged so the
      // route's existing error handling behaves identically.
      if (status >= 400 || j.error) {
        return { status, body: json };
      }

      const choice = j.choices?.[0];
      const rawContent = choice?.message?.content;
      const text = typeof rawContent === "string" ? rawContent : "";
      const stopReason =
        (choice?.finish_reason && FINISH_REASON_MAP[choice.finish_reason]) ?? "end_turn";

      const body = {
        id: j.id ?? "openai-proxy",
        type: "message",
        role: "assistant",
        model: j.model,
        content: [{ type: "text", text }],
        stop_reason: stopReason,
        stop_sequence: null,
        usage: {
          input_tokens: j.usage?.prompt_tokens ?? 0,
          output_tokens: j.usage?.completion_tokens ?? 0,
        },
      };

      return { status, body };
    },
  };
}
