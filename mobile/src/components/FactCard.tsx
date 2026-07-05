import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  type LayoutChangeEvent,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { t } from "../i18n";
import type { AppLanguage, DailyFact } from "../lib/types";
import { colors, fonts, heroFont, paperBodyFont, radius, spacing } from "../theme";
import { DatePostmark } from "./DatePostmark";
import { formatDispatch } from "./slipUtils";

interface Props {
  fact: DailyFact;
  language: AppLanguage;
  /** History mini-slip: smaller type, no flip / motion / wordmark. */
  compact?: boolean;
}

/**
 * The Slip — a cream paper dispatch "mailed" onto the dark desk.
 *
 * Full mode (Today screen): flippable card.
 *   Front: № · DatePostmark · seal/topic · hero fact · flip hint · source stamp · wordmark.
 *   Back:  「寄给你的理由」title · whyCare body · flip-back hint · wordmark.
 *   Tap anywhere on the card (except the source stamp) to flip.
 *   The source stamp Pressable captures its own touch; the outer flip Pressable does not fire.
 *
 * Compact mode (History list): unchanged, no flip.
 */
export function FactCard({ fact, language, compact = false }: Props) {
  const strings = t(language);
  const isPaper = fact.source.kind === "paper";
  const hasUrl = typeof fact.source.url === "string" && fact.source.url.length > 0;
  const whyCarePending = fact.whyCare === "";

  // ── Mail arrival: translateY +10→0, scale .98→1, 180ms ease-out ──────
  const arrivalAnim = useRef(new Animated.Value(compact ? 1 : 0)).current;
  useEffect(() => {
    if (compact) return;
    arrivalAnim.setValue(0);
    Animated.timing(arrivalAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [arrivalAnim, compact, fact.source.factId]);

  const arrivalMotion = {
    opacity: arrivalAnim,
    transform: [
      { translateY: arrivalAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
      { scale: arrivalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
    ],
  };

  // ── Flip state & animation (full mode only) ───────────────────────────
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Reset to front face whenever a new fact arrives.
  const [backHeight, setBackHeight] = useState(0);
  useEffect(() => {
    if (!compact) {
      flipAnim.setValue(0);
      setFlipped(false);
      setBackHeight(0);
    }
  }, [fact.source.factId, compact, flipAnim]);

  const frontRotateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const backRotateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const handleFlip = useCallback(() => {
    const toValue = flipped ? 0 : 1;
    Animated.timing(flipAnim, {
      toValue,
      duration: 350,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setFlipped((f) => !f);
    });
  }, [flipped, flipAnim]);

  // Measure back face height so the container is tall enough when back is shown.
  // Front face is in normal flow (sets the base container height).
  // Back face is position: absolute — its measured height is stored as minHeight.
  const onBackLayout = useCallback(
    (e: LayoutChangeEvent) => {
      setBackHeight((h) => Math.max(h, e.nativeEvent.layout.height));
    },
    [],
  );

  // ── Shared stamp markup ───────────────────────────────────────────────
  const stampText = fact.source.label;

  const StampBox = (tilt: boolean) => (
    <View style={[styles.stamp, tilt && styles.stampTilt]}>
      <Text style={styles.stampText}>
        {"⌖ "}
        {stampText}
        {"  "}
        <Text style={styles.stampCheck}>✓</Text>
      </Text>
    </View>
  );

  // ── Compact mode: unchanged layout, no flip ───────────────────────────
  if (compact) {
    return (
      <Animated.View
        style={[styles.slip, isPaper && styles.slipPaper, styles.slipCompact, arrivalMotion]}
      >
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <Text style={[styles.dispatch, styles.dispatchCompact]}>
              {formatDispatch(fact.source.factId)}
            </Text>
            {isPaper && (
              <View style={styles.seal}>
                <Text style={styles.sealText}>{strings.firstClassSeal}</Text>
              </View>
            )}
          </View>
          <Text style={styles.topic} numberOfLines={1}>
            {fact.topic}
          </Text>
        </View>
        <Text style={[styles.factCompact, { fontFamily: heroFont(language) }]}>{fact.fact}</Text>
        <View style={styles.stampRow}>
          {hasUrl ? (
            <Pressable
              onPress={() => void Linking.openURL(fact.source.url!)}
              hitSlop={{ top: 11, bottom: 11, left: 8, right: 8 }}
            >
              {StampBox(true)}
            </Pressable>
          ) : (
            StampBox(true)
          )}
        </View>
      </Animated.View>
    );
  }

  // ── Full mode: flip-enabled slip ──────────────────────────────────────
  return (
    <Animated.View style={[styles.flipOuter, arrivalMotion]}>
      {/*
       * flipContainer: relative-positioned container.
       * Front face is in normal flow → sets the container's natural height.
       * Back face is position: absolute, top/left/right 0 → overlays front.
       * minHeight: backHeight ensures the container is tall enough when the
       * back face (measured via onBackLayout) is taller than the front.
       */}
      <View
        style={[styles.flipContainer, backHeight > 0 ? { minHeight: backHeight } : undefined]}
      >
        {/* ── FRONT FACE (normal flow) ─────────────────────────────────── */}
        <Animated.View
          style={[
            styles.flipSlip,
            isPaper && styles.slipPaper,
            {
              transform: [{ perspective: 1000 }, { rotateY: frontRotateY }],
              backfaceVisibility: "hidden",
            },
          ]}
        >
          {/*
           * Outer Pressable handles the flip tap for the whole card.
           * The nested stamp Pressable captures its own touches — React Native's
           * responder system ensures the outer flip Pressable does not fire
           * when the stamp area is tapped.
           */}
          <Pressable onPress={handleFlip} style={styles.flipSlipContent}>
            {/* Top row: dispatch № + seal (left), DatePostmark (right) */}
            <View style={[styles.topRow, styles.topRowFull]}>
              <View style={styles.topLeft}>
                <Text style={styles.dispatch}>{formatDispatch(fact.source.factId)}</Text>
                {isPaper && (
                  <View style={styles.seal}>
                    <Text style={styles.sealText}>{strings.firstClassSeal}</Text>
                  </View>
                )}
              </View>
              <DatePostmark date={fact.date} size={64} />
            </View>

            <Text style={styles.topic} numberOfLines={1}>
              {fact.topic}
            </Text>

            <Text style={[styles.factText, { fontFamily: heroFont(language) }]}>
              {fact.fact}
            </Text>

            {/* Flip affordance — quiet marginal annotation below the fact */}
            <View style={styles.flipHintRow}>
              <Text style={styles.flipHintText}>
                {strings.flipFrontHint}{"  "}{"↷"}
              </Text>
            </View>

            {/* Stamp row: nested Pressable catches URL tap, outer flip Pressable stays silent */}
            <View style={styles.stampRow}>
              {hasUrl ? (
                <Pressable
                  onPress={() => void Linking.openURL(fact.source.url!)}
                  hitSlop={{ top: 11, bottom: 11, left: 8, right: 8 }}
                >
                  {StampBox(true)}
                </Pressable>
              ) : (
                StampBox(true)
              )}
            </View>

            <Text style={styles.wordmark}>OHLO · DAILY DISPATCH</Text>
          </Pressable>
        </Animated.View>

        {/* ── BACK FACE (absolute, overlays front) ─────────────────────── */}
        <Animated.View
          style={[
            styles.flipSlip,
            isPaper && styles.slipPaper,
            styles.flipFaceBack,
            {
              transform: [{ perspective: 1000 }, { rotateY: backRotateY }],
              backfaceVisibility: "hidden",
            },
          ]}
          onLayout={onBackLayout}
        >
          <Pressable onPress={handleFlip} style={styles.flipSlipContent}>
            {/* Eyebrow title */}
            <Text style={styles.backTitle}>{strings.flipBackTitle}</Text>

            {/* Why Care body — the whole face breathes */}
            {!whyCarePending ? (
              <Text style={[styles.backWhyText, { fontFamily: paperBodyFont(language) }]}>
                {fact.whyCare}
              </Text>
            ) : (
              <Text style={[styles.backWhyPending, { fontFamily: paperBodyFont(language) }]}>
                {strings.flipBackPending}
              </Text>
            )}

            {/* Flip-back affordance */}
            <View style={styles.flipHintRow}>
              <Text style={styles.flipHintText}>
                {"↶"}{"  "}{strings.flipBackHint}
              </Text>
            </View>

            <Text style={styles.wordmark}>OHLO · DAILY DISPATCH</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // ── Compact (History list) slip ───────────────────────────────────────
  slip: {
    backgroundColor: colors.paper0,
    borderRadius: radius.slip,
    borderBottomWidth: 4,
    borderBottomColor: colors.paperEdge,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  slipCompact: { padding: spacing.md },
  // 头等信笺 — premium paper track: persimmon seal-edge on the left.
  slipPaper: {
    borderLeftWidth: 4,
    borderLeftColor: colors.persimmon,
  },

  // ── Full (Today) flip container ───────────────────────────────────────
  // Carries the marginBottom that used to live on styles.slip.
  flipOuter: {
    marginBottom: spacing.md,
  },
  // Relative container for both faces.
  // Front face (normal flow) sets natural height; minHeight added inline when
  // the back face is taller.
  flipContainer: {},
  // Frame for each face: background + borders, NO padding.
  // Padding lives on the inner flipSlipContent Pressable so the whole
  // card surface is tappable (including the padding zone).
  flipSlip: {
    backgroundColor: colors.paper0,
    borderRadius: radius.slip,
    borderBottomWidth: 4,
    borderBottomColor: colors.paperEdge,
  },
  // Inner padding — applied to the Pressable so the full surface is tappable.
  flipSlipContent: {
    padding: spacing.lg,
  },
  // Back face sits absolutely on top of the front face.
  flipFaceBack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },

  // ── Shared layout pieces ──────────────────────────────────────────────
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  // Non-compact: postmark replaces topic in the row — top-align so the
  // dispatch № sits at the top of the taller postmark circle.
  topRowFull: {
    alignItems: "flex-start",
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 1,
  },
  dispatch: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: colors.persimmon,
    letterSpacing: 1,
  },
  dispatchCompact: { fontSize: 12 },
  // 头等件 seal — a tiny persimmon-bordered mono tag next to the №.
  seal: {
    borderWidth: 1,
    borderColor: colors.persimmon,
    borderRadius: radius.stamp,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  sealText: {
    fontFamily: fonts.mono,
    fontSize: 8.5,
    letterSpacing: 1,
    color: colors.persimmon,
  },
  topic: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.paraSoft,
    flexShrink: 0,
  },
  factText: {
    color: colors.paraInk,
    fontSize: 23,
    lineHeight: 35,
    marginTop: spacing.xs,
  },
  factCompact: {
    color: colors.paraInk,
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.sm,
  },
  stampRow: { flexDirection: "row", marginTop: spacing.md },
  stamp: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderColor: colors.postmark,
    borderRadius: radius.stamp,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  // The tilt is applied separately so compact and full can both use the base stamp.
  stampTilt: {
    transform: [{ rotate: "-1.2deg" }],
  },
  stampText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.postmark,
    letterSpacing: 0.3,
  },
  stampCheck: { color: colors.mint },
  wordmark: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.paraSoft,
    opacity: 0.7,
    marginTop: spacing.md,
    textAlign: "center",
  },

  // ── Front flip affordance ─────────────────────────────────────────────
  flipHintRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.sm,
  },
  flipHintText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.paraSoft,
    letterSpacing: 0.3,
    opacity: 0.8,
  },

  // ── Back face content ─────────────────────────────────────────────────
  backTitle: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.paraSoft,
    marginBottom: spacing.md,
  },
  backWhyText: {
    color: colors.paraInk,
    fontSize: 15,
    lineHeight: 25,
  },
  backWhyPending: {
    color: colors.paraSoft,
    fontSize: 15,
    lineHeight: 25,
    fontStyle: "italic",
  },
});
