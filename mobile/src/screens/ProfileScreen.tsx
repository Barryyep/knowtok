import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { systemLanguage, t } from "../i18n";
import { savePersonaEverywhere } from "../lib/personaService";
import type { AppLanguage, Profile } from "../lib/types";
import { colors, fonts, radius, spacing, uiFont } from "../theme";

interface Props {
  initial: Profile | null;
  /** First-run setup shows the big CTA; from Settings it's just "Save". */
  isFirstRun: boolean;
  onSaved: (profile: Profile) => void;
}

export function ProfileScreen({ initial, isFirstRun, onSaved }: Props) {
  const [profile, setProfile] = useState<Profile>(
    initial ?? { name: "", occupation: "", interests: "", language: systemLanguage() },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const strings = t(profile.language);
  const ui = (w?: "regular" | "medium" | "semibold" | "bold") => uiFont(profile.language, w);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    if (!profile.occupation.trim() && !profile.interests.trim()) {
      setError(strings.needProfile);
      return;
    }
    setError(null);
    setBusy(true);
    await savePersonaEverywhere(profile);
    setBusy(false);
    onSaved(profile);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>KNOWTOK · DAILY DISPATCH</Text>
        <Text style={[styles.title, { fontFamily: ui("bold") }]}>{strings.profileTitle}</Text>
        <Text style={[styles.subtitle, { fontFamily: ui() }]}>{strings.profileSubtitle}</Text>

        <Field
          label={strings.languageLabel}
          language={profile.language}
          input={
            <View style={styles.langRow}>
              {(["zh", "en"] as AppLanguage[]).map((lang) => (
                <Pressable
                  key={lang}
                  onPress={() => set("language", lang)}
                  style={[styles.langPill, profile.language === lang && styles.langPillActive]}
                >
                  <Text
                    style={[
                      styles.langPillText,
                      profile.language === lang && styles.langPillTextActive,
                    ]}
                  >
                    {lang === "zh" ? "中文" : "English"}
                  </Text>
                </Pressable>
              ))}
            </View>
          }
        />
        <Field
          label={strings.nameLabel}
          language={profile.language}
          input={
            <TextInput
              style={styles.input}
              value={profile.name}
              onChangeText={(v) => set("name", v)}
              placeholder={strings.namePlaceholder}
              placeholderTextColor={colors.inkMuted}
            />
          }
        />
        <Field
          label={strings.occupationLabel}
          language={profile.language}
          input={
            <TextInput
              style={styles.input}
              value={profile.occupation}
              onChangeText={(v) => set("occupation", v)}
              placeholder={strings.occupationPlaceholder}
              placeholderTextColor={colors.inkMuted}
            />
          }
        />
        <Field
          label={strings.interestsLabel}
          language={profile.language}
          input={
            <TextInput
              style={styles.input}
              value={profile.interests}
              onChangeText={(v) => set("interests", v)}
              placeholder={strings.interestsPlaceholder}
              placeholderTextColor={colors.inkMuted}
            />
          }
        />

        {error && <Text style={[styles.error, { fontFamily: ui() }]}>{error}</Text>}

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.paper0} />
          ) : (
            <Text style={[styles.saveButtonText, { fontFamily: ui("semibold") }]}>
              {isFirstRun ? strings.startDaily : strings.save}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  input,
  language,
}: {
  label: string;
  input: React.ReactNode;
  language: AppLanguage;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { fontFamily: uiFont(language) }]}>{label}</Text>
      {input}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink900 },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl * 2 },
  eyebrow: {
    color: colors.marigold,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  title: { color: colors.inkText, fontSize: 28, fontWeight: "700" },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 15,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    lineHeight: 22,
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
  error: { color: colors.persimmon, marginBottom: spacing.md },
  saveButton: {
    backgroundColor: colors.persimmon,
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  saveButtonText: { color: colors.paper0, fontSize: 16 },
});
