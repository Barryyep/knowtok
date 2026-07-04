import { StyleSheet, View } from "react-native";

import { colors, spacing } from "../../theme";

interface Props {
  /** Zero-based index of the current step. */
  current: number;
  /** Total number of steps. */
  total: number;
}

/**
 * The marigold progress rail that lives under the safe inset — one dot per
 * onboarding step. Steps up to and including the current one are filled
 * (the letter is on its way); upcoming steps stay as faint outlines.
 */
export function ProgressDots({ current, total }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i <= current && styles.dotFilled]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    borderWidth: 1,
    borderColor: colors.marigold,
    opacity: 0.5,
  },
  dotFilled: { backgroundColor: colors.marigold, opacity: 1 },
});
