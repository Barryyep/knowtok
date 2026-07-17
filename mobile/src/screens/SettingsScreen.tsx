import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import { deleteAccount } from "../lib/accountService";
import { readerTypeLabel, readingStyleLabel } from "../lib/onboarding";
import { supabase } from "../lib/supabase";
import type { AppLanguage, Profile } from "../lib/types";
import { colors, fonts, radius, spacing, uiFont } from "../theme";

interface Props {
  profile: Profile;
  onEditProfile: () => void;
  onEditRadar: () => void;
  onChangeLanguage: (lang: AppLanguage) => void;
}

export function SettingsScreen({ profile, onEditProfile, onEditRadar, onChangeLanguage }: Props) {
  const strings = t(profile.language);
  const insets = useSafeAreaInsets();
  const ui = (w?: "regular" | "medium" | "semibold" | "bold") => uiFont(profile.language, w);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = () => {
    if (deleting) return;
    Alert.alert(strings.deleteAccountConfirmTitle, strings.deleteAccountConfirmBody, [
      { text: strings.deleteAccountCancel, style: "cancel" },
      {
        text: strings.deleteAccountConfirmAction,
        style: "destructive",
        onPress: () => {
          setDeleting(true);
          deleteAccount()
            // Success needs no navigation here — the local signOut inside
            // deleteAccount fires the auth listener in App.tsx, which
            // returns the user to the sign-in screen.
            .catch(() => Alert.alert(strings.deleteAccountFailed))
            .finally(() => setDeleting(false));
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.md }]}
    >
      <Text style={styles.eyebrow}>OHLO · DAILY DISPATCH</Text>
      <Text style={[styles.heading, { fontFamily: ui("bold") }]}>{strings.tabSettings}</Text>

      {/* Profile group */}
      <View style={styles.group}>
        <Pressable style={styles.row} onPress={onEditRadar}>
          <View style={styles.rowTextWrap}>
            <Text style={[styles.rowTitle, { fontFamily: ui("semibold") }]}>
              {strings.radarScreenTitle}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable style={styles.row} onPress={onEditProfile}>
          <View style={styles.rowTextWrap}>
            <Text style={[styles.rowTitle, { fontFamily: ui("semibold") }]}>
              {strings.settingsProfile}
            </Text>
            <Text style={[styles.rowDetail, { fontFamily: ui() }]}>
              {[
                profile.occupation
                  ? readerTypeLabel(profile.occupation, profile.language)
                  : "",
                profile.interests
                  ? readingStyleLabel(profile.interests, profile.language)
                  : "",
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable style={styles.row} onPress={() => void supabase.auth.signOut()}>
          <Text style={[styles.rowTitle, styles.danger, { fontFamily: ui("semibold") }]}>
            {strings.signOut}
          </Text>
        </Pressable>

        <View style={styles.divider} />

        <Pressable style={styles.row} onPress={handleDeleteAccount} disabled={deleting}>
          <Text
            style={[
              styles.rowTitle,
              styles.danger,
              deleting && { opacity: 0.4 },
              { fontFamily: ui("semibold") },
            ]}
          >
            {deleting ? "…" : strings.deleteAccount}
          </Text>
        </Pressable>
      </View>

      {/* Language group */}
      <View style={styles.group}>
        <View style={styles.row}>
          <View style={styles.rowTextWrap}>
            <Text style={[styles.rowTitle, { fontFamily: ui("semibold") }]}>
              {strings.languageLabel}
            </Text>
          </View>
          <View style={langToggleStyles.pillRow}>
            {(["zh", "en"] as AppLanguage[]).map((lang) => (
              <Pressable
                key={lang}
                onPress={() => onChangeLanguage(lang)}
                style={[
                  langToggleStyles.pill,
                  profile.language === lang && langToggleStyles.pillActive,
                ]}
              >
                <Text
                  style={[
                    langToggleStyles.pillText,
                    profile.language === lang && langToggleStyles.pillTextActive,
                  ]}
                >
                  {lang === "zh" ? "中文" : "English"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Widget group */}
      <View style={styles.group}>
        <View style={styles.row}>
          <View style={styles.rowTextWrap}>
            <Text style={[styles.rowTitle, { fontFamily: ui("semibold") }]}>
              {strings.settingsWidgetTitle}
            </Text>
            <Text style={[styles.rowDetail, { fontFamily: ui() }]}>
              {strings.settingsWidgetHint}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.about, { fontFamily: ui() }]}>{strings.settingsAbout}</Text>
    </ScrollView>
  );
}

const langToggleStyles = StyleSheet.create({
  pillRow: { flexDirection: "row", gap: spacing.xs },
  pill: {
    borderColor: colors.inkLine,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  pillActive: { backgroundColor: colors.persimmon, borderColor: colors.persimmon },
  pillText: { color: colors.inkMuted, fontSize: 14 },
  pillTextActive: { color: colors.paper0, fontWeight: "600" },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink900 },
  scroll: { padding: spacing.lg, paddingTop: spacing.xxl },
  eyebrow: {
    color: colors.marigold,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  heading: { color: colors.inkText, fontSize: 24, fontWeight: "800", marginBottom: spacing.lg },
  group: {
    backgroundColor: colors.ink800,
    borderColor: colors.inkLine,
    borderWidth: 1,
    borderRadius: radius.slip,
    overflow: "hidden",
    marginBottom: spacing.md,
  },
  row: {
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowTextWrap: { flex: 1 },
  divider: { height: 1, backgroundColor: colors.inkLine, marginHorizontal: spacing.md },
  rowTitle: { color: colors.inkText, fontSize: 16 },
  danger: { color: colors.persimmon },
  rowDetail: { color: colors.inkMuted, fontSize: 13, marginTop: 2 },
  chevron: { color: colors.inkMuted, fontSize: 22, marginLeft: spacing.sm },
  about: {
    color: colors.inkMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: spacing.xl,
    lineHeight: 18,
  },
});
