/**
 * goodvision is an Anthropic-compatible gateway (backed by Bedrock).
 * We talk to it with plain fetch against the Messages API.
 *
 * Available models: claude-opus-4-8 / claude-sonnet-4-6 / claude-haiku-4-5.
 * (goodvision does NOT serve claude-fable-5.)
 */
export const GOODVISION_BASE_URL =
  process.env.EXPO_PUBLIC_GOODVISION_BASE_URL ?? "https://api.goodvision.tech";

/** Fun facts are short; sonnet is the quality/cost sweet spot. */
export const GOODVISION_MODEL =
  process.env.EXPO_PUBLIC_GOODVISION_MODEL ?? "claude-sonnet-4-6";

/**
 * Build-time key from .env (EXPO_PUBLIC_* is inlined into the JS bundle).
 * V1 ships the key inside the app binary — acceptable for personal builds,
 * must move behind a server before any public release.
 */
export const ENV_API_KEY = process.env.EXPO_PUBLIC_GOODVISION_API_KEY ?? "";

/** iOS App Group shared between the app and the widget extension. */
export const APP_GROUP = "group.com.ohlo.daily";

/** Key inside shared storage that the iOS widget reads. */
export const WIDGET_FACT_KEY = "todayFact";

/** Android widget name — must match app.json plugin config. */
export const ANDROID_WIDGET_NAME = "DailyFact";

/**
 * How many past facts we remember to avoid ever repeating one. A year of
 * dailies plus generous 换一条 usage is still only ~100KB of AsyncStorage;
 * dedup correctness beats the negligible storage cost.
 */
export const FACT_HISTORY_SIZE = 500;

/** AsyncStorage key for the one-time 头等件 / FIRST CLASS explainer flag. */
export const FIRST_CLASS_HINT_KEY = "ohlo:firstClassHintSeen:v1";
