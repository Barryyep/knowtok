import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * One-time explainer flag for the 头等件 / FIRST CLASS slip. The first time a
 * user is shown a paper-track (first-class) slip we surface a dismissible
 * caption; once dismissed we never show it again. Stored outside lib/ on
 * purpose — this is pure presentation state, not part of the frozen data
 * contract.
 */
const SEEN_KEY = "ohlo:firstClassHintSeen:v1";

/** Has the first-class explainer already been dismissed? */
export async function firstClassHintSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SEEN_KEY)) === "1";
  } catch {
    // Never let storage failure block the UI — just show the hint.
    return false;
  }
}

/** Mark the first-class explainer as dismissed. */
export async function markFirstClassHintSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Best-effort; a re-show on next launch is harmless.
  }
}
