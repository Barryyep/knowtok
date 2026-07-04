import { useEffect, useRef } from "react";
import { Animated, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../i18n";
import type { AppLanguage, DailyFact } from "../lib/types";
import { colors, fonts, heroFont, paperBodyFont, radius, spacing } from "../theme";
import { formatDispatch } from "./slipUtils";

interface Props {
  fact: DailyFact;
  language: AppLanguage;
  /** Show the pending ellipsis line while whyCare is empty. */
  whyCarePending?: boolean;
  /** History mini-slip: smaller type, no why-care / motion / wordmark. */
  compact?: boolean;
}

/**
 * The Slip — a cream paper dispatch "mailed" onto the dark desk.
 * № top-left · hero fact · dashed hairline · 跟你有什么关系 · tilted source
 * stamp · fold-edge bottom. Paper-track facts get the FIRST CLASS treatment.
 */
export function FactCard({ fact, language, whyCarePending = false, compact = false }: Props) {
  const strings = t(language);
  const isPaper = fact.source.kind === "paper";
  const hasUrl = typeof fact.source.url === "string" && fact.source.url.length > 0;

  // 落信 — mail arrival: translateY +10→0, scale .98→1, 180ms ease-out.
  const anim = useRef(new Animated.Value(compact ? 1 : 0)).current;
  useEffect(() => {
    if (compact) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [anim, compact, fact.source.factId]);

  const motion = {
    opacity: anim,
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
      { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
    ],
  };

  const stampText = isPaper && fact.source.arxivId ? `arXiv:${fact.source.arxivId}` : fact.source.label;

  const Stamp = (
    <View style={[styles.stamp, compact && styles.stampCompact]}>
      <Text style={styles.stampText}>
        {"⌖ "}
        {stampText}
        {"  "}
        <Text style={styles.stampCheck}>✓</Text>
      </Text>
    </View>
  );

  return (
    <Animated.View
      style={[styles.slip, isPaper && styles.slipPaper, compact && styles.slipCompact, motion]}
    >
      <View style={styles.topRow}>
        <Text style={[styles.dispatch, compact && styles.dispatchCompact]}>
          {formatDispatch(fact.source.factId)}
        </Text>
        {isPaper ? (
          <Text style={styles.firstClass}>FIRST CLASS</Text>
        ) : (
          <Text style={styles.topic}>
            {fact.emoji} {fact.topic}
          </Text>
        )}
      </View>

      <Text
        style={[
          compact ? styles.factCompact : styles.factText,
          { fontFamily: heroFont(language) },
        ]}
      >
        {fact.fact}
      </Text>

      {!compact && (fact.whyCare !== "" || whyCarePending) && (
        <>
          <View style={styles.dashed} />
          <Text style={[styles.whyLabel, { fontFamily: paperBodyFont(language) }]}>
            {strings.whyCareLabel}
          </Text>
          {fact.whyCare !== "" ? (
            <Text style={[styles.whyText, { fontFamily: paperBodyFont(language) }]}>
              {fact.whyCare}
            </Text>
          ) : (
            <Text style={[styles.whyPending, { fontFamily: paperBodyFont(language) }]}>
              {strings.whyCarePending}
            </Text>
          )}
        </>
      )}

      <View style={styles.stampRow}>
        {hasUrl ? (
          <Pressable onPress={() => void Linking.openURL(fact.source.url!)} hitSlop={6}>
            {Stamp}
          </Pressable>
        ) : (
          Stamp
        )}
      </View>

      {!compact && (
        <Text style={styles.wordmark}>KNOWTOK · DAILY DISPATCH</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slip: {
    backgroundColor: colors.paper0,
    borderRadius: radius.slip,
    borderBottomWidth: 4,
    borderBottomColor: colors.paperEdge, // the fold edge — "it's paper"
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  slipCompact: { padding: spacing.md },
  // 头等信笺 — premium paper track: persimmon seal-edge on the left.
  slipPaper: {
    borderLeftWidth: 4,
    borderLeftColor: colors.persimmon,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dispatch: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: colors.persimmon,
    letterSpacing: 1,
  },
  dispatchCompact: { fontSize: 12 },
  firstClass: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.persimmon,
  },
  topic: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.paraSoft,
  },
  emoji: { fontSize: 26, marginTop: spacing.md, marginBottom: spacing.xs },
  factText: {
    color: colors.paraInk,
    fontSize: 23,
    lineHeight: 35, // 23 * ~1.5
    marginTop: spacing.xs,
  },
  factCompact: {
    color: colors.paraInk,
    fontSize: 16,
    lineHeight: 23,
    marginTop: spacing.sm,
  },
  dashed: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderTopColor: colors.paperEdge,
    marginVertical: spacing.md,
  },
  whyLabel: {
    color: colors.paraSoft,
    fontSize: 12,
    letterSpacing: 0.3,
    marginBottom: spacing.xs,
  },
  whyText: { color: colors.paraInk, fontSize: 13, lineHeight: 21 },
  whyPending: { color: colors.paraSoft, fontSize: 13, lineHeight: 21, fontStyle: "italic" },
  stampRow: { flexDirection: "row", marginTop: spacing.md },
  stamp: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderColor: colors.postmark,
    borderRadius: radius.stamp,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    transform: [{ rotate: "-1.2deg" }], // hand-stamped tilt
  },
  stampCompact: { transform: [{ rotate: "-1.2deg" }] },
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
});
