import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { t } from "../../i18n";
import type { AppLanguage } from "../../lib/types";
import { colors, fonts, spacing, uiFont } from "../../theme";
import { PrimaryPill } from "./PrimaryPill";

interface Props {
  language: AppLanguage;
  name: string;
  occupation: string;
  interests: string;
  onChangeName: (v: string) => void;
  onChangeOccupation: (v: string) => void;
  onChangeInterests: (v: string) => void;
  error: string | null;
  onContinue: () => void;
  bottomInset: number;
}

/**
 * 这是写给谁的信 — the only "form" step, kept honest and small. Occupation
 * (or interests) is the one soft gate; name is optional; free interests text
 * sharpens the personalized 「跟你有什么关系」line and nothing else.
 */
export function AboutStep({
  language,
  name,
  occupation,
  interests,
  onChangeName,
  onChangeOccupation,
  onChangeInterests,
  error,
  onContinue,
  bottomInset,
}: Props) {
  const strings = t(language);
  const ui = (w?: "regular" | "medium" | "semibold" | "bold") => uiFont(language, w);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>OHLO · DAILY DISPATCH</Text>
        <Text style={[styles.title, { fontFamily: ui("bold") }]}>{strings.aboutTitle}</Text>
        <Text style={[styles.subtitle, { fontFamily: ui() }]}>{strings.aboutSubtitle}</Text>

        <Field label={strings.occupationLabel} language={language}>
          <TextInput
            style={styles.input}
            value={occupation}
            onChangeText={onChangeOccupation}
            placeholder={strings.occupationPlaceholder}
            placeholderTextColor={colors.inkMuted}
          />
        </Field>

        <Field label={strings.nameLabel} language={language}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={onChangeName}
            placeholder={strings.namePlaceholder}
            placeholderTextColor={colors.inkMuted}
          />
        </Field>

        <Field label={strings.interestsLabel} language={language}>
          <TextInput
            style={styles.input}
            value={interests}
            onChangeText={onChangeInterests}
            placeholder={strings.interestsPlaceholder}
            placeholderTextColor={colors.inkMuted}
          />
        </Field>

        <Text style={[styles.whyLine, { fontFamily: ui() }]}>{strings.aboutWhyLine}</Text>

        {error && <Text style={[styles.error, { fontFamily: ui() }]}>{error}</Text>}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomInset + spacing.md }]}>
        <PrimaryPill label={strings.continueLabel} language={language} onPress={onContinue} />
      </View>
    </View>
  );
}

function Field({
  label,
  language,
  children,
}: {
  label: string;
  language: AppLanguage;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { fontFamily: uiFont(language) }]}>{label}</Text>
      {children}
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
  field: { marginBottom: spacing.md },
  label: { color: colors.inkMuted, fontSize: 13, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.ink800,
    borderColor: colors.inkLine,
    borderWidth: 1,
    borderRadius: 12,
    color: colors.inkText,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  whyLine: {
    color: colors.paraSoft,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  error: { color: colors.persimmon, marginTop: spacing.md },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.inkLine,
    backgroundColor: colors.ink900,
  },
});
