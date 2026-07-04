import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot, { type ViewShotRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

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
import { firstClassHintSeen, markFirstClassHintSeen } from "../components/firstClassHint";

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
  const [showFirstClassHint, setShowFirstClassHint] = useState(false);

  const shotRef = useRef<ViewShotRef>(null);

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
          current?.source.factId === withWhy.source.factId ? withWhy : current,
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

  // First time a first-class (paper-track) slip appears, offer the one-time
  // explainer. Dismissed forever once tapped.
  useEffect(() => {
    if (fact?.source.kind !== "paper") {
      setShowFirstClassHint(false);
      return;
    }
    void firstClassHintSeen().then((seen) => {
      if (!seen) setShowFirstClassHint(true);
    });
  }, [fact?.source.kind, fact?.source.factId]);

  const dismissFirstClassHint = useCallback(() => {
    setShowFirstClassHint(false);
    void markFirstClassHintSeen();
  }, []);

  // Capture the slip (wordmark + source stamp already baked in) and hand it to
  // the system share sheet. Cancel/failure is silent per DESIGN.md.
  const onShare = useCallback(async () => {
    try {
      const uri = await shotRef.current?.capture?.();
      if (!uri) return;
      if (!(await Sharing.isAvailableAsync())) return;
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: strings.share,
        UTI: "public.png",
      });
    } catch {
      // Swallow: user cancelled or the capture failed — nothing to surface.
    }
  }, [strings.share]);

  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + spacing.md, paddingBottom: spacing.lg },
      ]}
    >
      {loading && (
        <View style={styles.stateBox}>
          <ActivityIndicator color={colors.persimmon} size="large" />
          <Text style={[styles.loadingText, { fontFamily: uiFont(profile.language) }]}>
            {strings.loading}
          </Text>
        </View>
      )}

      {!loading && error && (
        <View style={styles.stateBox}>
          <View style={styles.errorCard}>
            <Text style={[styles.errorTitle, { fontFamily: uiFont(profile.language, "semibold") }]}>
              {strings.errorTitle}
            </Text>
            <Text style={[styles.errorDetail, { fontFamily: uiFont(profile.language) }]}>
              {error}
            </Text>
            <Pressable style={styles.pill} onPress={() => void load(false)}>
              <Text style={[styles.pillText, { fontFamily: uiFont(profile.language, "semibold") }]}>
                {strings.retry}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {!loading && !error && fact && (
        <>
          {/* Centered hero region: eyebrow directly above the slip. */}
          <View style={styles.hero}>
            <DateEyebrow date={fact.date} streak={streak} />
            <ViewShot ref={shotRef} options={{ format: "png", result: "tmpfile" }}>
              <FactCard
                fact={fact}
                language={profile.language}
                whyCarePending={fact.whyCare === ""}
              />
            </ViewShot>

            {showFirstClassHint && (
              <Pressable style={styles.hintRow} onPress={dismissFirstClassHint}>
                <Text style={[styles.hintText, { fontFamily: uiFont(profile.language) }]}>
                  {strings.firstClassExplainer}
                </Text>
                <Text style={styles.hintClose}>×</Text>
              </Pressable>
            )}
          </View>

          {/* Bottom action row: 换一条 pill centered, share to its right. */}
          <View style={styles.actionRow}>
            <View style={styles.actionSpacer} />
            <Pressable style={styles.pill} onPress={() => void load(true)}>
              <Ionicons name="swap-horizontal" color={colors.paper0} size={16} />
              <Text style={[styles.pillText, { fontFamily: uiFont(profile.language, "semibold") }]}>
                {strings.refresh}
              </Text>
            </Pressable>
            {/* Disabled while the whyCare line is still pending, so the share
                image can't capture the placeholder text. */}
            <Pressable
              style={[styles.shareButton, fact.whyCare === "" && styles.shareButtonDisabled]}
              onPress={() => void onShare()}
              disabled={fact.whyCare === ""}
              accessibilityLabel={strings.share}
              accessibilityState={{ disabled: fact.whyCare === "" }}
              hitSlop={8}
            >
              <Ionicons name="share-outline" color={colors.marigold} size={20} />
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const SHARE_SIZE = 44;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink900 },
  // flexGrow lets the content fill the viewport (so the hero can center and the
  // action row sits at the bottom), yet scroll once a tall whyCare overflows.
  scroll: { flexGrow: 1, padding: spacing.lg },
  hero: { flex: 1, justifyContent: "center" },
  stateBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  loadingText: { color: colors.inkMuted, fontSize: 15 },
  errorCard: {
    alignSelf: "stretch",
    backgroundColor: colors.ink800,
    borderColor: colors.inkLine,
    borderWidth: 1,
    borderRadius: radius.slip,
    padding: spacing.lg,
  },
  errorTitle: { color: colors.persimmon, fontSize: 16 },
  errorDetail: { color: colors.inkMuted, fontSize: 13, marginVertical: spacing.sm },
  // One-time 头等件 caption under the slip; tap anywhere to dismiss.
  hintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  hintText: { flex: 1, color: colors.inkMuted, fontSize: 12, lineHeight: 18 },
  hintClose: { color: colors.inkMuted, fontSize: 16, lineHeight: 18 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  // Balances the share button on the right so the pill stays visually centered.
  actionSpacer: { width: SHARE_SIZE },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.persimmon,
    borderRadius: radius.pill,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
  },
  pillText: { color: colors.paper0, fontSize: 15 },
  shareButton: {
    width: SHARE_SIZE,
    height: SHARE_SIZE,
    borderRadius: SHARE_SIZE / 2,
    backgroundColor: colors.ink800,
    borderWidth: 1,
    borderColor: colors.inkLine,
    alignItems: "center",
    justifyContent: "center",
  },
  shareButtonDisabled: { opacity: 0.35 },
});
