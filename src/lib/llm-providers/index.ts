import { createGoodvisionProvider } from "./goodvision";
import { createAnthropicProvider } from "./anthropic";
import { createOpenaiProvider } from "./openai";
import type { LlmProvider } from "./types";

export type { AnthropicMessagesRequest, LlmProvider, ProviderResult } from "./types";

/**
 * Provider registry: maps the LLM_PROVIDER env value to a factory and the env
 * var that holds that provider's API key. Adding a provider is a one-line entry.
 */
const REGISTRY: Record<string, { create: () => LlmProvider; keyEnv: string }> = {
  goodvision: { create: createGoodvisionProvider, keyEnv: "GOODVISION_API_KEY" },
  anthropic: { create: createAnthropicProvider, keyEnv: "ANTHROPIC_API_KEY" },
  openai: { create: createOpenaiProvider, keyEnv: "OPENAI_API_KEY" },
};

const DEFAULT_PROVIDER = "goodvision";

function selectedEntry() {
  const name = (process.env.LLM_PROVIDER ?? DEFAULT_PROVIDER).toLowerCase();
  return REGISTRY[name] ?? REGISTRY[DEFAULT_PROVIDER];
}

/** The provider selected by env `LLM_PROVIDER` (defaults to "goodvision"). */
export function getProvider(): LlmProvider {
  return selectedEntry().create();
}

/** The API key for the selected provider, read from its provider-specific env var. */
export function getApiKey(): string | undefined {
  return process.env[selectedEntry().keyEnv];
}

/** The env var name holding the selected provider's key (used for error logging). */
export function getApiKeyEnvName(): string {
  return selectedEntry().keyEnv;
}
