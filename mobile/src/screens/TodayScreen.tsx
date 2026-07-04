import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { requestWidgetUpdate } from "react-native-android-widget";

import { t } from "../i18n";
import { ANDROID_WIDGET_NAME } from "../lib/config";
import { generateWhyCare, getTodayFact } from "../lib/factService";
import { loadFactHistory } from "../lib/storage";
import type { DailyFact, Profile } from "../lib/types";
import { FactWidget } from "../widgets/FactWidget";
import { colors, radius, spacing, uiFont } from "../theme";
import { FactCard } from "../components/FactCard";
import { DateEyebrow } from "../components/DateEyebrow";
import { streakCount } from "../components/slipUtils";

interface Props {
  profile: Profile;
}

/** Re-render the Android home-screen widget with the fresh fact. */
async function syncAndroidWidget(fact: DailyFact, profile: Profile) {
  if (Platform.OS !== "android") return;
  await requestWidgetUpdate({
    widgetName: ANDROID_WIDGET_NAME,
    renderWidget: () => <FactWidget fact={fact} language={profile.language} />,
    widgetNotFound: () => {},
  });
}

export function TodayScreen({ profile }: Props) {
  const strings = t(profile.language);
  const [fact, setFact] = useState<DailyFact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const refreshStreak = useCallback(() => {
    void loadFactHistory().then((h) => setStreak(streakCount(h)));
  }, []);

  const load = useCallback(
    async (forceRefresh: boolean) => {
      setLoading(true);
      setError(null);
      try {
        // Card content is a real paper — renders in well under a second.
        const next = await getTodayFact(profile, { forceRefresh });
        setFact(next);
        setLoading(false);
        refreshStreak();
        await syncAndroidWidget(next, profile);
        // The personalized line arrives async; UI never blocks on the LLM.
        const withWhy = await generateWhyCare(profile, next);
        setFact((current) =>
          current?.source.paperId === withWhy.source.paperId ? withWhy : current,
        );
        await syncAndroidWidget(withWhy, profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    },
    [profile, refreshStreak],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll}>
      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.persimmon} size="large" />
          <Text style={[styles.loadingText, { fontFamily: uiFont(profile.language) }]}>
            {strings.loading}
          </Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.errorCard}>
          <Text style={[styles.errorTitle, { fontFamily: uiFont(profile.language, "semibold") }]}>
            {strings.errorTitle}
          </Text>
          <Text style={[styles.errorDetail, { fontFamily: uiFont(profile.language) }]}>{error}</Text>
          <Pressable style={styles.pill} onPress={() => void load(false)}>
            <Text style={[styles.pillText, { fontFamily: uiFont(profile.language, "semibold") }]}>
              {strings.retry}
            </Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && fact && (
        <>
          <DateEyebrow date={fact.date} streak={streak} />
          <FactCard
            fact={fact}
            language={profile.language}
            whyCarePending={fact.whyCare === ""}
          />
          <View style={styles.pillRow}>
            <Pressable style={styles.pill} onPress={() => void load(true)}>
              <Ionicons name="swap-horizontal" color={colors.paper0} size={16} />
              <Text style={[styles.pillText, { fontFamily: uiFont(profile.language, "semibold") }]}>
                {strings.refresh}
              </Text>
            </Pressable>
          </View>
          <Text style={[styles.widgetHint, { fontFamily: uiFont(profile.language) }]}>
            {strings.widgetHint}
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink900 },
  scroll: { padding: spacing.lg, paddingTop: spacing.xxl },
  centerBox: { alignItems: "center", paddingVertical: spacing.xl * 2, gap: spacing.md },
  loadingText: { color: colors.inkMuted, fontSize: 15 },
  errorCard: {
    backgroundColor: colors.ink800,
    borderColor: colors.inkLine,
    borderWidth: 1,
    borderRadius: radius.slip,
    padding: spacing.lg,
  },
  errorTitle: { color: colors.persimmon, fontSize: 16 },
  errorDetail: { color: colors.inkMuted, fontSize: 13, marginVertical: spacing.sm },
  pillRow: { alignItems: "center", marginTop: spacing.md },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "center",
    backgroundColor: colors.persimmon,
    borderRadius: radius.pill,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  pillText: { color: colors.paper0, fontSize: 15 },
  widgetHint: {
    color: colors.inkMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: spacing.lg,
    textAlign: "center",
  },
});
