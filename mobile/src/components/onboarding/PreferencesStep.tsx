import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../../i18n";
import type { AppLanguage } from "../../lib/types";
import { colors, fonts, radius, spacing, uiFont } from "../../theme";
import { PrimaryPill } from "./PrimaryPill";

const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55+"];

interface Props {
  language: AppLanguage;
  ageRange?: string;
  onChangeAgeRange: (v: string | undefined) => void;
  onChangeLanguage: (v: AppLanguage) => void;
  busy: boolean;
  onFinish: () => void;
  bottomInset: number;
}

/**
 * 收信偏好 — the last touches: an optional age band (marigold single-select)
 * and the content language. Finishing here saves the persona and drops the
 * user into their first dispatch.
 */
export function PreferencesStep({
  language,
  ageRange,
  onChangeAgeRange,
  onChangeLanguage,
  busy,
  onFinish,
  bottomInset,
}: Props) {
  const strings = t(language);
  const ui = (w?: "regular" | "medium" | "semibold" | "bold") => uiFont(language, w);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>OHLO · DAILY DISPATCH</Text>
        <Text style={[styles.title, { fontFamily: ui("bold") }]}>{strings.prefsTitle}</Text>
        <Text style={[styles.subtitle, { fontFamily: ui() }]}>{strings.prefsSubtitle}</Text>

        <Text style={[styles.label, { fontFamily: ui() }]}>{strings.ageRangeLabel}</Text>
        <View style={styles.chipWrap}>
          {AGE_RANGES.map((range) => {
            const active = ageRange === range;
            return (
              <Pressable
                key={range}
                onPress={() => onChangeAgeRange(active ? undefined : range)}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.chipText,
                    active && styles.chipTextActive,
                    { fontFamily: ui("medium") },
                  ]}
                >
                  {range}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, styles.langLabel, { fontFamily: ui() }]}>
          {strings.languageLabel}
        </Text>
        <View style={styles.langRow}>
          {(["zh", "en"] as AppLanguage[]).map((lang) => {
            const active = language === lang;
            return (
              <Pressable
                key={lang}
                onPress={() => onChangeLanguage(lang)}
                style={[styles.langPill, active && styles.langPillActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.langPillText, active && styles.langPillTextActive]}>
                  {lang === "zh" ? "中文" : "English"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomInset + spacing.md }]}>
        <PrimaryPill
          label={strings.startDispatches}
          language={language}
          onPress={onFinish}
          busy={busy}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  eyebrow: {
    color: colors.marigold,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  title: { color: colors.inkText, fontSize: 26, fontWeight: "700", lineHeight: 34 },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  label: { color: colors.inkMuted, fontSize: 13, marginBottom: spacing.sm },
  langLabel: { marginTop: spacing.xl },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderColor: colors.inkLine,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
  },
  chipActive: { backgroundColor: colors.marigold, borderColor: colors.marigold },
  chipText: { color: colors.inkText, fontSize: 15 },
  chipTextActive: { color: colors.ink900, fontWeight: "600" },
  langRow: { flexDirection: "row", gap: spacing.sm },
  langPill: {
    borderColor: colors.inkLine,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  langPillActive: { backgroundColor: colors.persimmon, borderColor: colors.persimmon },
  langPillText: { color: colors.inkMuted, fontSize: 15 },
  langPillTextActive: { color: colors.paper0, fontWeight: "600" },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.inkLine,
    backgroundColor: colors.ink900,
  },
});
