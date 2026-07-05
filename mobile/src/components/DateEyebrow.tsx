import { StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import type { AppLanguage } from "../lib/types";
import { colors, fonts, spacing } from "../theme";
import { formatEyebrow } from "./slipUtils";

interface Props {
  /** Fact date, YYYY-MM-DD. */
  date: string;
  /** Distinct fact-days in the last 7 days. */
  streak: number;
  language: AppLanguage;
}

/**
 * The ritual line that lives ABOVE the slip (~24px tall): a marigold postmark
 * date on the left; when streak >= 2, a small mono streak counter on the right.
 */
export function DateEyebrow({ date, streak, language }: Props) {
  const streakText =
    streak >= 2
      ? t(language).streakLabel.replace("{n}", String(streak))
      : null;

  return (
    <View style={styles.row}>
      <Text style={styles.eyebrow}>{formatEyebrow(date)}</Text>
      {streakText !== null && (
        <Text style={styles.streakText}>{streakText}</Text>
      )}
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
  streakText: {
    color: colors.marigold,
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
  },
});
