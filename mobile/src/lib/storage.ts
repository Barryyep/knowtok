import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { ExtensionStorage } from "@bacons/apple-targets";

import { APP_GROUP, FACT_HISTORY_SIZE, FIRST_CLASS_HINT_KEY, WIDGET_FACT_KEY } from "./config";
import { sendFactToWatch } from "./watchSync";
import type { DailyFact, FactKind, FactSource, Profile } from "./types";

const PROFILE_KEY = "ohlo:profile:v2";
const FACT_KEY = "ohlo:todayFact:v2";
const HISTORY_KEY = "ohlo:factHistory:v2";
const OWNER_KEY = "ohlo:cacheOwner:v1";
// Prefix used by personaTrack.ts — mirrored here so clearLocalData can sweep
// all entries without importing from that module (avoids a circular dep).
const PERSONA_TRACK_PREFIX = "ohlo:personaTrack:v1:";
// UI-state key owned by components/firstClassHint.ts — included in per-user
// wipe so a new account sees the hint fresh. Canonical definition: lib/config.ts.

// No-ops safely on Android (the native module is iOS-only).
const iosSharedStorage = new ExtensionStorage(APP_GROUP);

export async function loadProfile(): Promise<Profile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Profile;
  // Normalize legacy profiles that predate curiosityDomains — fill the required
  // field so callers never encounter undefined where string[] is expected.
  if (!parsed.curiosityDomains) {
    parsed.curiosityDomains = [];
  }
  return parsed;
}

export async function saveProfile(profile: Profile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function clearLocalData(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const personaTrackKeys = allKeys.filter((k) => k.startsWith(PERSONA_TRACK_PREFIX));
  await AsyncStorage.multiRemove([
    PROFILE_KEY,
    FACT_KEY,
    HISTORY_KEY,
    OWNER_KEY,
    FIRST_CLASS_HINT_KEY,
    ...personaTrackKeys,
  ]);
  // Clear widget and watch surfaces on iOS so the previous user's fact does
  // not linger after sign-out or account switch.
  if (Platform.OS === "ios") {
    iosSharedStorage.remove(WIDGET_FACT_KEY);
    ExtensionStorage.reloadWidget();
    // Overwrite the watch applicationContext with an empty payload so the
    // watch shows its placeholder instead of the previous user's fact.
    sendFactToWatch("");
  }
}

/**
 * Bind the local cache to a specific auth user. Idempotent and cheap when
 * the owner already matches (single AsyncStorage read). When the stored owner
 * differs — a different account signed in on the same device — ALL per-user
 * local state is wiped before the new owner is recorded, preventing a
 * data-leak where a new user sees the previous user's persona or fact.
 *
 * Call this BEFORE loadProfile() in the session effect so the fast "local
 * first" path is guaranteed to read the correct user's data.
 *
 * Race-safety: concurrent calls with the same userId both fast-path on the
 * read. If two calls race with different userIds (extreme edge case), the
 * double-wipe is idempotent and the last write wins — correct behaviour.
 */
export async function ensureCacheOwner(userId: string): Promise<void> {
  const owner = await AsyncStorage.getItem(OWNER_KEY);
  if (owner === userId) return; // fast path — already this user, nothing to do
  if (owner !== null) {
    // A different user's data is in the cache — wipe before loading anything.
    await clearLocalData();
  }
  // First install (owner === null) or post-wipe: stamp the new owner.
  await AsyncStorage.setItem(OWNER_KEY, userId);
}

/**
 * Upgrade a stored fact to the current FactSource shape. Entries written by an
 * older v2 shape (source had paperId/arxivId but NO kind/factId/label) crash the
 * UI: FactCard → formatDispatch → dispatchNumber reads `factId.length`, and a
 * missing factId throws "Cannot read property 'length' of undefined". We salvage
 * such entries by deriving factId from paperId and backfilling kind/label; an
 * entry with no id we can hash is unrecoverable and is dropped (null).
 */
function normalizeStoredFact(fact: DailyFact | null | undefined): DailyFact | null {
  if (!fact || typeof fact !== "object") return null;
  const source = fact.source as Partial<FactSource> | undefined;
  if (!source || typeof source !== "object") return null;

  // Prefer an existing id; fall back to the paper's id (paperToFact sets
  // factId === paperId, so this is the same stable dedup key).
  const factId = source.factId || source.paperId;
  if (!factId) return null;

  const kind: FactKind =
    source.kind ?? (source.paperId || source.arxivId ? "paper" : "general");

  // A general entry must not carry paper-only ids — a legacy row that kept a
  // stray paperId/arxivId would otherwise be misclassified back as "paper".
  const rebuilt: FactSource =
    kind === "general"
      ? { ...source, factId, kind, label: source.label ?? "", paperId: undefined, arxivId: undefined }
      : ({ ...source, factId, kind, label: source.label ?? "" } as FactSource);

  return { ...fact, source: rebuilt };
}

export async function loadStoredFact(): Promise<DailyFact | null> {
  const raw = await AsyncStorage.getItem(FACT_KEY);
  if (!raw) return null;
  try {
    return normalizeStoredFact(JSON.parse(raw) as DailyFact);
  } catch {
    return null;
  }
}

export async function loadFactHistory(): Promise<DailyFact[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as DailyFact[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeStoredFact)
      .filter((f): f is DailyFact => f !== null);
  } catch {
    return [];
  }
}

/** Mirror the fact to the iOS widget (App Group) and the watch. */
function syncNativeSurfaces(fact: DailyFact): void {
  if (Platform.OS !== "ios") return;
  const json = JSON.stringify(fact);
  iosSharedStorage.set(WIDGET_FACT_KEY, json);
  ExtensionStorage.reloadWidget();
  sendFactToWatch(json);
}

/**
 * Persist a new daily fact: app cache + history ring + iOS widget +
 * watch. Android widgets re-read AsyncStorage in their task handler,
 * so requestWidgetUpdate is triggered by the caller instead.
 */
export async function saveFact(fact: DailyFact): Promise<void> {
  const history = await loadFactHistory();
  const nextHistory = [
    fact,
    ...history.filter((f) => f.source.factId !== fact.source.factId),
  ].slice(0, FACT_HISTORY_SIZE);

  await AsyncStorage.multiSet([
    [FACT_KEY, JSON.stringify(fact)],
    [HISTORY_KEY, JSON.stringify(nextHistory)],
  ]);
  syncNativeSurfaces(fact);
}

/** Update the whyCare line on an already-saved fact (async arrival). */
export async function updateStoredWhyCare(fact: DailyFact): Promise<void> {
  const [current, history] = await Promise.all([loadStoredFact(), loadFactHistory()]);
  if (current && current.source.factId === fact.source.factId) {
    await AsyncStorage.setItem(FACT_KEY, JSON.stringify(fact));
    syncNativeSurfaces(fact);
  }
  const nextHistory = history.map((f) =>
    f.source.factId === fact.source.factId ? fact : f,
  );
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
}
