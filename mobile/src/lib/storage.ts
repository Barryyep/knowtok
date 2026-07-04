import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { ExtensionStorage } from "@bacons/apple-targets";

import { APP_GROUP, FACT_HISTORY_SIZE, WIDGET_FACT_KEY } from "./config";
import { sendFactToWatch } from "./watchSync";
import type { DailyFact, FactKind, FactSource, Profile } from "./types";

const PROFILE_KEY = "knowtok:profile:v2";
const FACT_KEY = "knowtok:todayFact:v2";
const HISTORY_KEY = "knowtok:factHistory:v2";

// No-ops safely on Android (the native module is iOS-only).
const iosSharedStorage = new ExtensionStorage(APP_GROUP);

export async function loadProfile(): Promise<Profile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  return raw ? (JSON.parse(raw) as Profile) : null;
}

export async function saveProfile(profile: Profile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function clearLocalData(): Promise<void> {
  await AsyncStorage.multiRemove([PROFILE_KEY, FACT_KEY, HISTORY_KEY]);
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

  return {
    ...fact,
    source: { ...source, factId, kind, label: source.label ?? "" } as FactSource,
  };
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
  const current = await loadStoredFact();
  if (current && current.source.factId === fact.source.factId) {
    await AsyncStorage.setItem(FACT_KEY, JSON.stringify(fact));
    syncNativeSurfaces(fact);
  }
  const history = await loadFactHistory();
  const nextHistory = history.map((f) =>
    f.source.factId === fact.source.factId ? fact : f,
  );
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
}
