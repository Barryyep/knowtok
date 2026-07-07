import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import type { AppLanguage } from "../lib/types";
import { colors, fonts, spacing } from "../theme";

interface Props {
  /** Distinct fact-days in the last 7 days. */
  streak: number;
  language: AppLanguage;
}

/**
 * The ritual line that lives ABOVE the slip (~24px tall).
 * Shows only the streak label (「连续 N 天」) when streak ≥ 2; renders nothing
 * when streak < 2 so the top area stays clean. The date is on the DatePostmark
 * inside the card — no need to duplicate it here.
 */
export function DateEyebrow({ streak, language }: Props) {
  if (streak < 2) return null;

  return (
    <View style={styles.row}>
      <Text style={styles.streakText}>
        {t(language).streakLabel.replace("{n}", String(streak))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  streakText: {
    color: colors.marigold,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
  },
});
