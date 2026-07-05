import AsyncStorage from "@react-native-async-storage/async-storage";

import { FIRST_CLASS_HINT_KEY } from "../lib/config";

/**
 * One-time explainer flag for the 头等件 / FIRST CLASS slip. The first time a
 * user is shown a paper-track (first-class) slip we surface a dismissible
 * caption; once dismissed we never show it again. Stored outside lib/ on
 * purpose — this is pure presentation state, not part of the frozen data
 * contract.
 */

/** Has the first-class explainer already been dismissed? */
export async function firstClassHintSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(FIRST_CLASS_HINT_KEY)) === "1";
  } catch {
    // Never let storage failure block the UI — just show the hint.
    return false;
  }
}

/** Mark the first-class explainer as dismissed. */
export async function markFirstClassHintSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(FIRST_CLASS_HINT_KEY, "1");
  } catch {
    // Best-effort; a re-show on next launch is harmless.
  }
}
