import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Manual replacement for React Native's built-in KeyboardAvoidingView.
 *
 * KeyboardAvoidingView measures its own on-screen position via onLayout to
 * compute how much padding to add — on this app's React Native 0.86 / Expo
 * SDK 57 (New Architecture / Fabric), that internal measurement raced the
 * keyboard-show event badly enough to render the whole screen blank (while
 * staying fully interactive underneath) on every text input in onboarding,
 * regardless of autoFocus timing, animation wrappers, or render-tree
 * isolation. Bypassing the built-in component's internal frame math
 * entirely: track the keyboard's own reported height from the OS event
 * directly, and apply it as plain padding. No onLayout, no frame
 * measurement, nothing for that race to corrupt.
 */
// Untested: a React hook wired to native Keyboard events needs a component
// renderer + a Keyboard-event-capable RN mock, neither of which exist in
// this project's node-only vitest setup (see mobile/AGENTS.md) — the only
// thing here worth unit-testing (the ios/android event-name branch) is a
// one-line ternary, not worth standing up that infra for.
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates?.height ?? 0));
    const hideSub = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  return height;
}
