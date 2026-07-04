import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import { loadFactHistory } from "../lib/storage";
import type { DailyFact, Profile } from "../lib/types";
import { colors, fonts, spacing, uiFont } from "../theme";
import { FactCard } from "../components/FactCard";

interface Props {
  profile: Profile;
}

export function HistoryScreen({ profile }: Props) {
  const strings = t(profile.language);
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<DailyFact[]>([]);

  useFocusEffect(
    useCallback(() => {
      void loadFactHistory().then(setHistory);
    }, []),
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.source.factId}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + spacing.md }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.eyebrow}>ARCHIVE</Text>
            <Text style={[styles.heading, { fontFamily: uiFont(profile.language, "bold") }]}>
              {strings.tabHistory}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.empty, { fontFamily: uiFont(profile.language) }]}>
            {strings.historyEmpty}
          </Text>
        }
        renderItem={({ item }) => <FactCard fact={item} language={profile.language} compact />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink900 },
  list: { padding: spacing.lg, paddingTop: spacing.xxl },
  header: { marginBottom: spacing.lg },
  eyebrow: {
    color: colors.marigold,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  heading: { color: colors.inkText, fontSize: 24, fontWeight: "800" },
  empty: { color: colors.inkMuted, fontSize: 14, textAlign: "center", marginTop: spacing.xl },
});
