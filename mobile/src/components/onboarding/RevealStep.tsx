import { useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../../i18n";
import { applyClassifiedVotes, quizResult } from "../../lib/quiz";
import type { QuizState } from "../../lib/quiz";
import { classifyOtherAnswers } from "../../lib/quizClassify";
import { domainLabel } from "../../lib/taxonomy";
import type { AppLanguage, Profile } from "../../lib/types";
import {
  colors,
  fonts,
  heroFont,
  paperBodyFont,
  radius,
  spacing,
} from "../../theme";
import { PrimaryPill } from "./PrimaryPill";

interface Props {
  language: AppLanguage;
  profile: Profile;
  /** Pre-classification quiz state; classification runs during the loading phase. */
  quizState: QuizState;
  busy: boolean;
  /** Called with the post-classification state so ProfileScreen can compute the final profile. */
  onFinish: (classifiedState: QuizState) => void;
  bottomInset: number;
}

/**
 * Quiz reveal — Phase 1: sorting animation (~1.2s) + real LLM classification
 * of 「其他」 answers. Phase 2: 落信 card with curiosity radar, taste spectrum,
 * rhythm line. Classification races a 6s timeout; any failure → proceeds on
 * deterministic votes alone. Minimum phase-1 display = 1.2s (no flash).
 */
export function RevealStep({
  language,
  profile,
  quizState,
  busy,
  onFinish,
  bottomInset,
}: Props) {
  const strings = t(language);
  const [phase, setPhase] = useState<"loading" | "reveal">("loading");

  // Classified state — starts as the unclassified state, updated after classification.
  const [classifiedState, setClassifiedState] = useState<QuizState>(quizState);

  // Loading phase — local progress bar.
  const loadingAnim = useRef(new Animated.Value(0)).current;

  // Reveal phase — slip entrance + bar animations (4 slots for max radar domains).
  const cardAnim = useRef(new Animated.Value(0)).current;
  const barAnims = useRef<Animated.Value[]>(
    Array.from({ length: 4 }, () => new Animated.Value(0)),
  ).current;

  // Run classification in parallel with the minimum 1.2s loading display.
  useEffect(() => {
    Animated.timing(loadingAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: false,
    }).start();

    const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 1200));

    const classifyWork = async (): Promise<QuizState> => {
      if (quizState.otherAnswers.length === 0) return quizState;
      try {
        const votes = await Promise.race<Record<string, number>>([
          classifyOtherAnswers(quizState.otherAnswers, language),
          new Promise<Record<string, number>>((resolve) =>
            setTimeout(() => resolve({}), 6_000),
          ),
        ]);
        return applyClassifiedVotes(quizState, votes);
      } catch {
        return quizState;
      }
    };

    void Promise.all([minDelay, classifyWork()]).then(([, classified]) => {
      setClassifiedState(classified);
      setPhase("reveal");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate the reveal card once classification is done.
  useEffect(() => {
    if (phase !== "reveal") return;
    const result = quizResult(classifiedState);
    cardAnim.setValue(0);
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      Animated.stagger(
        80,
        barAnims.slice(0, result.domains.length).map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }),
        ),
      ).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Loading phase ─────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <View style={styles.loadingRoot}>
        <Text style={styles.loadingText}>{strings.revealSorting}</Text>
        <View style={styles.loadingTrack}>
          <Animated.View
            style={[
              styles.loadingFill,
              {
                width: loadingAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }) as any,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  // ── Reveal phase ──────────────────────────────────────────────────────────
  const result = quizResult(classifiedState);

  const radarTitle = profile.name
    ? language === "zh"
      ? `${profile.name} 的好奇雷达`
      : `${profile.name} — what pulls you in`
    : strings.revealRadarTitle;

  let rhythmText: string;
  if (profile.readingMoment === "cracks") {
    rhythmText = strings.revealRhythmCracks;
  } else if (profile.readingMoment === "night") {
    rhythmText = strings.revealRhythmNight;
  } else {
    rhythmText = strings.revealRhythmDefault;
  }

  const cardMotion = {
    opacity: cardAnim,
    transform: [
      {
        translateY: cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
    ],
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.scrollBody,
        { paddingBottom: bottomInset + spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={[styles.card, cardMotion]}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { fontFamily: heroFont(language) }]}>
            {radarTitle}
          </Text>
          <Text style={styles.cardNo}>№ ----</Text>
        </View>

        <View style={styles.dashed} />

        {/* Radar bars */}
        {result.domains.map((d, i) => {
          const barAnim = barAnims[i] ?? new Animated.Value(1);
          return (
            <View key={d.id} style={styles.barRow}>
              <Text
                style={[
                  styles.barLabel,
                  { fontFamily: paperBodyFont(language) },
                ]}
              >
                {domainLabel(d.id, language)}
              </Text>
              <View style={styles.barTrack}>
                <Animated.View
                  style={[
                    styles.barFill,
                    {
                      width: barAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", `${Math.round(d.strength * 100)}%`],
                      }) as any,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}

        <View style={styles.dashed} />

        {/* Spectrum row */}
        <Text style={styles.sectionLabel}>{strings.revealSpectrumLabel.toUpperCase()}</Text>
        <View style={styles.spectrumRow}>
          <Text style={[styles.spectrumEndLabel, { fontFamily: paperBodyFont(language) }]}>
            {strings.revealSurprise}
          </Text>
          <Text style={[styles.spectrumEndLabel, { fontFamily: paperBodyFont(language) }]}>
            {strings.revealDepth}
          </Text>
        </View>
        <View style={styles.spectrumTrack}>
          <View
            style={[
              styles.spectrumDot,
              {
                left: result.style === "depth_thinker" ? "78%" : "18%",
              },
            ]}
          />
        </View>

        <View style={styles.dividerSm} />

        {/* Rhythm row */}
        <Text style={styles.sectionLabel}>{strings.revealRhythmLabel.toUpperCase()}</Text>
        <Text style={[styles.rhythmText, { fontFamily: paperBodyFont(language) }]}>
          {rhythmText}
        </Text>

        {/* Footnote */}
        <Text style={[styles.footnote, { fontFamily: paperBodyFont(language) }]}>
          {strings.revealFootnote}
        </Text>
      </Animated.View>

      <View style={styles.ctaWrap}>
        <PrimaryPill
          label={strings.revealCta}
          language={language}
          onPress={() => onFinish(classifiedState)}
          busy={busy}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Loading phase
  loadingRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    fontFamily: fonts.mono,
    color: colors.inkMuted,
    fontSize: 13,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  loadingTrack: {
    width: "60%",
    height: 2,
    backgroundColor: colors.inkLine,
    borderRadius: 1,
    overflow: "hidden",
  },
  loadingFill: {
    height: 2,
    backgroundColor: colors.marigold,
  },
  // Reveal phase
  root: { flex: 1 },
  scrollBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.paper0,
    borderRadius: radius.slip,
    borderBottomWidth: 3,
    borderBottomColor: colors.paperEdge,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  cardTitle: {
    color: colors.paraInk,
    fontSize: 18,
    lineHeight: 26,
    flex: 1,
    marginRight: spacing.sm,
  },
  cardNo: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.inkMuted,
  },
  dashed: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.paperEdge,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.paraSoft,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  // Radar bars
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  barLabel: {
    color: colors.paraInk,
    fontSize: 14,
    width: 100,
    flexShrink: 0,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.paperEdge,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    backgroundColor: colors.persimmon,
    borderRadius: 3,
  },
  // Spectrum
  spectrumRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  spectrumEndLabel: {
    color: colors.paraSoft,
    fontSize: 13,
  },
  spectrumTrack: {
    height: 2,
    backgroundColor: colors.paperEdge,
    borderRadius: 1,
    marginBottom: spacing.md,
    position: "relative",
  },
  spectrumDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.persimmon,
    top: -3,
  },
  dividerSm: {
    height: spacing.sm,
  },
  // Rhythm
  rhythmText: {
    color: colors.paraInk,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  // Footnote
  footnote: {
    color: colors.paraSoft,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.md,
  },
  ctaWrap: {
    marginTop: spacing.xl,
  },
});
