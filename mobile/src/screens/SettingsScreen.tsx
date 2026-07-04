import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/types";
import { colors, fonts, radius, spacing, uiFont } from "../theme";

interface Props {
  profile: Profile;
  onEditProfile: () => void;
}

export function SettingsScreen({ profile, onEditProfile }: Props) {
  const strings = t(profile.language);
  const ui = (w?: "regular" | "medium" | "semibold" | "bold") => uiFont(profile.language, w);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      <Text style={styles.eyebrow}>KNOWTOK · DAILY DISPATCH</Text>
      <Text style={[styles.heading, { fontFamily: ui("bold") }]}>{strings.tabSettings}</Text>

      <View style={styles.group}>
        <Pressable style={styles.row} onPress={onEditProfile}>
          <View style={styles.rowTextWrap}>
            <Text style={[styles.rowTitle, { fontFamily: ui("semibold") }]}>
              {strings.settingsProfile}
            </Text>
            <Text style={[styles.rowDetail, { fontFamily: ui() }]}>
              {[profile.occupation, profile.interests].filter(Boolean).join(" · ") || "—"}
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
      </View>

      <Text style={[styles.about, { fontFamily: ui() }]}>{strings.settingsAbout}</Text>
    </ScrollView>
  );
}

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
