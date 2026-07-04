import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

interface WatchSyncModule {
  sendFact(json: string): boolean;
}

const native = Platform.OS === "ios" ? requireOptionalNativeModule<WatchSyncModule>("WatchSync") : null;

/**
 * Push today's fact to the paired Apple Watch via WatchConnectivity
 * (updateApplicationContext — delivered even if the watch app is closed).
 * No-op on Android / when the module isn't linked (e.g. Expo Go).
 */
export function sendFactToWatch(json: string): void {
  try {
    native?.sendFact(json);
  } catch (err) {
    console.warn("watch sync failed:", err);
  }
}
