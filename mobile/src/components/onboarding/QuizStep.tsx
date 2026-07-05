import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../../i18n";
import { CARD_PROMPTS } from "../../lib/quiz";
import type { QuizItem, QuizOption } from "../../lib/quiz";
import type { Spark } from "../../lib/taxonomy";
import type { AppLanguage } from "../../lib/types";
import { colors, fonts, heroFont, radius, spacing } from "../../theme";

interface QuizStepProps {
  item: Extract<QuizItem, { kind: "choice" }> | Extract<QuizItem, { kind: "cards" }>;
  language: AppLanguage;
  /** For 'cards' kind only — the three sparks to show. */
  cardTrio?: Spark[];
  onChoicePick?: (option: QuizOption) => void;
  onCardPick?: (domainId: string) => void;
  onSkip?: () => void;
  bottomInset: number;
}

/**
 * Handles both 'choice' (trivia questions) and 'cards' (spark deck) items.
 * Slip entrance is staggered on mount; tap flashes persimmon for 250ms then auto-advances.
 */
export function QuizStep({
  item,
  language,
  cardTrio,
  onChoicePick,
  onCardPick,
  onSkip,
  bottomInset,
}: QuizStepProps) {
  const strings = t(language);

  const slips =
    item.kind === "choice"
      ? item.options
      : (cardTrio ?? ([] as Spark[]));

  // One stagger anim per slip, created once on mount.
  const staggerAnims = useRef<Animated.Value[]>(
    Array.from({ length: slips.length }, () => new Animated.Value(0)),
  ).current;

  // Single selected id for the 250ms flash; tapping ref guards double-fires.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tapping = useRef(false);

  useEffect(() => {
    Animated.stagger(
      40,
      staggerAnims.map((a) =>
        Animated.timing(a, { toValue: 1, duration: 300, useNativeDriver: true }),
      ),
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChoicePick = (option: QuizOption) => {
    if (tapping.current) return;
    tapping.current = true;
    setSelectedId(option.id);
    setTimeout(() => onChoicePick?.(option), 250);
  };

  const handleCardPick = (domainId: string) => {
    if (tapping.current) return;
    tapping.current = true;
    setSelectedId(domainId);
    setTimeout(() => onCardPick?.(domainId), 250);
  };

  if (item.kind === "choice") {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: bottomInset + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>OHLO · DAILY DISPATCH</Text>
        <Text style={[styles.title, { fontFamily: heroFont(language) }]}>
          {item[language]}
        </Text>

        <View style={styles.deck}>
          {item.options.map((option, i) => {
            const anim = staggerAnims[i] ?? new Animated.Value(1);
            const isSelected = selectedId === option.id;
            return (
              <Animated.View
                key={option.id}
                style={{
                  opacity: anim,
                  transform: [
                    {
                      translateY: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                }}
              >
                <Pressable
                  style={[styles.slip, isSelected && styles.slipSelected]}
                  onPress={() => handleChoicePick(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text style={[styles.slipText, { fontFamily: heroFont(language) }]}>
                    {option[language]}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {item.skippable && (
          <Pressable onPress={onSkip} style={styles.skipWrap}>
            <Text style={styles.skipText}>{strings.skipLabel}</Text>
          </Pressable>
        )}
      </ScrollView>
    );
  }

  // Cards kind
  const trio = cardTrio ?? ([] as Spark[]);
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.body,
        { paddingBottom: bottomInset + spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.eyebrow}>OHLO · DAILY DISPATCH</Text>
      <Text style={[styles.title, { fontFamily: heroFont(language) }]}>
        {CARD_PROMPTS[item.round]?.[language] ?? CARD_PROMPTS[0][language]}
      </Text>

      <View style={styles.deck}>
        {trio.map((spark, i) => {
          const anim = staggerAnims[i] ?? new Animated.Value(1);
          const isSelected = selectedId === spark.domainId;
          return (
            <Animated.View
              key={spark.domainId}
              style={{
                opacity: anim,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              }}
            >
              <Pressable
                style={[styles.slip, isSelected && styles.slipSelected]}
                onPress={() => handleCardPick(spark.domainId)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.slipText, { fontFamily: heroFont(language) }]}>
                  {spark[language]}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  eyebrow: {
    color: colors.marigold,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.inkText,
    fontSize: 22,
    lineHeight: 30,
    marginBottom: spacing.sm,
  },
  deck: { gap: spacing.md, marginTop: spacing.md },
  slip: {
    backgroundColor: colors.paper0,
    borderRadius: radius.slip,
    borderBottomWidth: 3,
    borderBottomColor: colors.paperEdge,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 80,
    justifyContent: "center",
  },
  slipSelected: {
    borderLeftWidth: 4,
    borderLeftColor: colors.persimmon,
    transform: [{ scale: 0.98 }],
  },
  slipText: { color: colors.paraInk, fontSize: 17, lineHeight: 26 },
  skipWrap: { marginTop: spacing.lg, alignItems: "center" },
  skipText: { color: colors.inkMuted, fontSize: 14 },
});
