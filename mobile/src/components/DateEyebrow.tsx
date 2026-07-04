import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, spacing } from "../theme";
import { formatEyebrow } from "./slipUtils";

interface Props {
  /** Fact date, YYYY-MM-DD. */
  date: string;
  /** Filled dots: distinct fact-days in the last 7 days. */
  streak: number;
}

/**
 * The ritual line that lives ABOVE the slip (~24px tall): a marigold
 * postmark date + 7 streak dots (filled marigold = a fact arrived that day).
 */
export function DateEyebrow({ date, streak }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.eyebrow}>{formatEyebrow(date)}</Text>
      <View style={styles.dots}>
        {Array.from({ length: 7 }).map((_, i) => (
          <View key={i} style={[styles.dot, i < streak && styles.dotFilled]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: colors.marigold,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 2,
  },
  dots: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.marigold,
    opacity: 0.55,
  },
  dotFilled: {
    backgroundColor: colors.marigold,
    opacity: 1,
  },
});
