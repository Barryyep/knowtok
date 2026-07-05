import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createGoodvisionProvider } from "@/lib/llm-providers/goodvision";
import { createAnthropicProvider } from "@/lib/llm-providers/anthropic";
import { createOpenaiProvider } from "@/lib/llm-providers/openai";
import { getApiKey, getApiKeyEnvName, getProvider } from "@/lib/llm-providers";
import type { AnthropicMessagesRequest } from "@/lib/llm-providers/types";

const sampleReq: AnthropicMessagesRequest = {
  model: "claude-sonnet-4-6",
  max_tokens: 512,
  system: "You are a helpful assistant.",
  messages: [{ role: "user", content: "Tell me a fact." }],
};

describe("goodvision provider (passthrough)", () => {
  const p = createGoodvisionProvider();

  test("uses x-api-key + anthropic-version auth headers", () => {
    const h = p.buildHeaders("KEY123");
    expect(h["x-api-key"]).toBe("KEY123");
    expect(h["anthropic-version"]).toBe("2023-06-01");
    expect(h.authorization).toBeUndefined();
  });

  test("buildBody is a verbatim passthrough", () => {
    expect(p.buildBody(sampleReq)).toBe(sampleReq);
  });

  test("parseResponse passes body + status through unchanged", () => {
    const upstream = { content: [{ type: "text", text: "hi" }], stop_reason: "end_turn" };
    expect(p.parseResponse(200, upstream)).toEqual({ status: 200, body: upstream });
  });

  test("default endpoint is the goodvision messages URL", () => {
    expect(p.endpoint).toBe("https://api.goodvision.tech/v1/messages");
  });
});

describe("anthropic provider (direct)", () => {
  const p = createAnthropicProvider();

  test("uses x-api-key + anthropic-version auth headers", () => {
    const h = p.buildHeaders("SK-ANT");
    expect(h["x-api-key"]).toBe("SK-ANT");
    expect(h["anthropic-version"]).toBe("2023-06-01");
  });

  test("buildBody is a verbatim passthrough", () => {
    expect(p.buildBody(sampleReq)).toBe(sampleReq);
  });

  test("parseResponse passes body + status through unchanged", () => {
    const upstream = { content: [{ type: "text", text: "yo" }] };
    expect(p.parseResponse(200, upstream)).toEqual({ status: 200, body: upstream });
  });

  test("default endpoint is api.anthropic.com", () => {
    expect(p.endpoint).toBe("https://api.anthropic.com/v1/messages");
  });
});

describe("openai provider (adapter)", () => {
  const p = createOpenaiProvider();

  test("uses Bearer auth header, not x-api-key", () => {
    const h = p.buildHeaders("sk-openai");
    expect(h.authorization).toBe("Bearer sk-openai");
    expect(h["x-api-key"]).toBeUndefined();
    expect(h["anthropic-version"]).toBeUndefined();
  });

  test("buildBody maps system → system role message, prepended", () => {
    const body = p.buildBody(sampleReq) as {
      model: string;
      messages: Array<{ role: string; content: unknown }>;
      max_tokens: number;
    };
    expect(body.messages[0]).toEqual({
      role: "system",
      content: "You are a helpful assistant.",
    });
    expect(body.messages[1]).toEqual({ role: "user", content: "Tell me a fact." });
  });

  test("buildBody maps max_tokens by default", () => {
    const body = p.buildBody(sampleReq) as { max_tokens: number };
    expect(body.max_tokens).toBe(512);
  });

  test("buildBody maps the anthropic model id to an OpenAI id via defaults", () => {
    const opus = p.buildBody({ ...sampleReq, model: "claude-opus-4-8" }) as { model: string };
    const haiku = p.buildBody({ ...sampleReq, model: "claude-haiku-4-5" }) as { model: string };
    expect(opus.model).toBe("gpt-4o");
    expect(haiku.model).toBe("gpt-4o-mini");
  });

  test("buildBody omits system message when system is absent/empty", () => {
    const body = p.buildBody({
      model: "claude-sonnet-4-6",
      max_tokens: 100,
      messages: [{ role: "user", content: "hey" }],
    }) as { messages: Array<{ role: string }> };
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
  });

  test("parseResponse maps choices[0].message.content → content[0].text", () => {
    const openaiResp = {
      id: "chatcmpl-1",
      model: "gpt-4o",
      choices: [{ message: { role: "assistant", content: "Bananas are berries." }, finish_reason: "stop" }],
      usage: { prompt_tokens: 12, completion_tokens: 5 },
    };
    const { status, body } = p.parseResponse(200, openaiResp);
    const b = body as {
      content: Array<{ type: string; text: string }>;
      stop_reason: string;
      usage: { input_tokens: number; output_tokens: number };
    };
    expect(status).toBe(200);
    expect(b.content).toEqual([{ type: "text", text: "Bananas are berries." }]);
    expect(b.stop_reason).toBe("end_turn");
    expect(b.usage).toEqual({ input_tokens: 12, output_tokens: 5 });
  });

  test("parseResponse maps finish_reason length → max_tokens", () => {
    const resp = {
      choices: [{ message: { content: "truncated" }, finish_reason: "length" }],
    };
    const { body } = p.parseResponse(200, resp);
    expect((body as { stop_reason: string }).stop_reason).toBe("max_tokens");
  });

  test("parseResponse preserves error status and body", () => {
    const err = { error: { message: "rate limited" } };
    const { status, body } = p.parseResponse(429, err);
    expect(status).toBe(429);
    expect(body).toBe(err);
  });
});

describe("getProvider / getApiKey selection", () => {
  const saved = {
    LLM_PROVIDER: process.env.LLM_PROVIDER,
    GOODVISION_API_KEY: process.env.GOODVISION_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  };

  beforeEach(() => {
    delete process.env.LLM_PROVIDER;
    process.env.GOODVISION_API_KEY = "gv-key";
    process.env.OPENAI_API_KEY = "oa-key";
    process.env.ANTHROPIC_API_KEY = "an-key";
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  test("defaults to goodvision when LLM_PROVIDER is unset", () => {
    expect(getProvider().name).toBe("goodvision");
    expect(getApiKeyEnvName()).toBe("GOODVISION_API_KEY");
    expect(getApiKey()).toBe("gv-key");
  });

  test("selects openai and reads OPENAI_API_KEY", () => {
    process.env.LLM_PROVIDER = "openai";
    expect(getProvider().name).toBe("openai");
    expect(getApiKeyEnvName()).toBe("OPENAI_API_KEY");
    expect(getApiKey()).toBe("oa-key");
  });

  test("selects anthropic and reads ANTHROPIC_API_KEY", () => {
    process.env.LLM_PROVIDER = "anthropic";
    expect(getProvider().name).toBe("anthropic");
    expect(getApiKey()).toBe("an-key");
  });

  test("falls back to goodvision for an unknown provider value", () => {
    process.env.LLM_PROVIDER = "nonesuch";
    expect(getProvider().name).toBe("goodvision");
  });
});
