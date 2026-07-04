import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

import type { AppLanguage } from "../../lib/types";
import { colors, radius, spacing, uiFont } from "../../theme";

interface Props {
  label: string;
  language: AppLanguage;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}

/**
 * The persimmon CTA pill pinned to the bottom of each onboarding step.
 * Dims (not hides) when its step gate isn't met yet, so the goal stays
 * visible while the hint explains what's missing.
 */
export function PrimaryPill({ label, language, onPress, disabled = false, busy = false }: Props) {
  return (
    <Pressable
      style={[styles.pill, (disabled || busy) && styles.pillDisabled]}
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy }}
    >
      {busy ? (
        <ActivityIndicator color={colors.paper0} />
      ) : (
        <Text style={[styles.label, { fontFamily: uiFont(language, "semibold") }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: colors.persimmon,
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  pillDisabled: { opacity: 0.4 },
  label: { color: colors.paper0, fontSize: 16 },
});
