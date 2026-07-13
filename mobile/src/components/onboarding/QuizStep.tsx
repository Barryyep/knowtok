import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { t } from "../../i18n";
import { CARD_PROMPTS } from "../../lib/quiz";
import type { QuizItem, QuizOption } from "../../lib/quiz";
import type { Spark } from "../../lib/taxonomy";
import type { AppLanguage } from "../../lib/types";
import { colors, fonts, heroFont, radius, spacing, uiFont } from "../../theme";
import { PrimaryPill } from "./PrimaryPill";

interface QuizStepProps {
  item: Extract<QuizItem, { kind: "choice" }> | Extract<QuizItem, { kind: "cards" }>;
  language: AppLanguage;
  /** For 'cards' kind only — the sparks to show (5 for multi, 3 for finals). */
  cardTrio?: Spark[];
  onChoicePick?: (option: QuizOption) => void;
  /** Called with free text when the user submits the 「其他」 option. */
  onOtherSubmit?: (text: string) => void;
  /** For cards — array of picked domainIds (empty array legal on multi rounds). */
  onCardPicks?: (domainIds: string[]) => void;
  onSkip?: () => void;
  bottomInset: number;
}

/**
 * Handles 'choice' (trivia questions) and 'cards' (spark deck) quiz items.
 * Choice: slip stagger + tap-to-advance (250ms flash), optional 「其他」 TextInput.
 * Cards multi: toggle selection, persist persimmon edge, Continue pill to commit.
 * Cards finals (multi:false): tap-to-advance single pick.
 */
export function QuizStep({
  item,
  language,
  cardTrio,
  onChoicePick,
  onOtherSubmit,
  onCardPicks,
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

  // Flash state for choice + finals single-select (250ms persimmon edge).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tapping = useRef(false);

  // Toggle state for multi card rounds (persists until continue).
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 「其他」 expand/collapse state.
  const [otherExpanded, setOtherExpanded] = useState(false);
  const [otherText, setOtherText] = useState("");

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

  const handleOtherConfirm = () => {
    const text = otherText.trim();
    if (!text) {
      setOtherExpanded(false);
      setOtherText("");
      return;
    }
    if (tapping.current) return;
    tapping.current = true;
    setSelectedId("__other__");
    setTimeout(() => onOtherSubmit?.(text), 250);
  };

  const handleCardToggle = (domainId: string) => {
    setSelectedIds((prev) =>
      prev.includes(domainId)
        ? prev.filter((id) => id !== domainId)
        : [...prev, domainId],
    );
  };

  const handleFinalsPick = (domainId: string) => {
    if (tapping.current) return;
    tapping.current = true;
    setSelectedId(domainId);
    setTimeout(() => onCardPicks?.([domainId]), 250);
  };

  const handleMultiConfirm = () => {
    if (tapping.current) return;
    tapping.current = true;
    onCardPicks?.(selectedIds);
  };

  // ── Choice ───────────────────────────────────────────────────────────────────
  if (item.kind === "choice") {
    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={[
          styles.body,
          { paddingBottom: bottomInset + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { fontFamily: heroFont(language) }]}>
          {item[language]}
        </Text>
        <Text style={[styles.selectHint, { fontFamily: uiFont(language) }]}>
          {strings.singleSelectHint}
        </Text>

        <View style={styles.deck}>
          {/* While 其他 is expanded, the sibling options are hidden rather than
              scrolled-around: this is a fixed 2-line-tall block that can never
              overflow below the keyboard, so there's nothing to scroll into
              view in the first place — see the git history on this file for
              two failed attempts at scrolling a taller, still-visible list. */}
          {!otherExpanded &&
            item.options.map((option, i) => {
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

          {item.allowOther && !otherExpanded && (
            <Pressable
              style={[styles.slip, styles.slipOther, selectedId === "__other__" && styles.slipSelected]}
              onPress={() => setOtherExpanded(true)}
              accessibilityRole="button"
            >
              <Text style={[styles.slipTextMuted, { fontFamily: heroFont(language) }]}>
                {strings.otherLabel}
              </Text>
            </Pressable>
          )}

          {item.allowOther && otherExpanded && (
            <View
              style={[
                styles.slip,
                styles.slipOtherExpanded,
                selectedId === "__other__" && styles.slipSelected,
              ]}
            >
              <TextInput
                style={[styles.otherInput, { fontFamily: heroFont(language) }]}
                value={otherText}
                onChangeText={setOtherText}
                autoFocus
                maxLength={120}
                placeholder={strings.otherPlaceholder}
                placeholderTextColor={colors.paraSoft}
                returnKeyType="done"
                onSubmitEditing={handleOtherConfirm}
              />
              <Pressable onPress={handleOtherConfirm} hitSlop={8} style={styles.otherConfirmBtn}>
                <Text style={styles.otherConfirmText}>{strings.otherConfirm}</Text>
              </Pressable>
            </View>
          )}

          {item.allowOther && otherExpanded && (
            <Pressable
              onPress={() => {
                setOtherExpanded(false);
                setOtherText("");
              }}
              style={styles.otherCancelWrap}
              hitSlop={8}
            >
              <Text style={[styles.otherCancelText, { fontFamily: uiFont(language) }]}>
                {strings.otherCancel}
              </Text>
            </Pressable>
          )}
        </View>

        {item.skippable && !otherExpanded && (
          <Pressable onPress={onSkip} style={styles.skipWrap}>
            <Text style={[styles.skipText, { fontFamily: uiFont(language) }]}>{strings.skipLabel}</Text>
          </Pressable>
        )}
      </ScrollView>
    );
  }

  // ── Cards ────────────────────────────────────────────────────────────────────
  const sparks = cardTrio ?? ([] as Spark[]);
  const isMulti = item.multi;
  const prompt = CARD_PROMPTS[item.round]?.[language] ?? CARD_PROMPTS[0][language];

  const cardSlips = (
    <View style={styles.deck}>
      {sparks.map((spark, i) => {
        const anim = staggerAnims[i] ?? new Animated.Value(1);
        const isSelected = isMulti
          ? selectedIds.includes(spark.domainId)
          : selectedId === spark.domainId;
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
              style={[
                styles.slip,
                isMulti && styles.slipCompact,
                isSelected && styles.slipSelected,
              ]}
              onPress={() =>
                isMulti
                  ? handleCardToggle(spark.domainId)
                  : handleFinalsPick(spark.domainId)
              }
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  isMulti ? styles.slipTextCompact : styles.slipText,
                  { fontFamily: heroFont(language) },
                ]}
              >
                {spark[language]}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );

  if (isMulti) {
    return (
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={[
            styles.body,
            { paddingBottom: spacing.sm },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { fontFamily: heroFont(language) }]}>
            {prompt}
          </Text>
          <Text style={[styles.selectHint, { fontFamily: uiFont(language) }]}>
            {strings.multiSelectHint}
          </Text>
          {cardSlips}
        </ScrollView>
        <View style={[styles.multiFooter, { paddingBottom: bottomInset + spacing.md }]}>
          <PrimaryPill
            label={strings.continueLabel}
            language={language}
            onPress={handleMultiConfirm}
          />
        </View>
      </View>
    );
  }

  // Finals — single-pick, tap-to-advance.
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.body,
        { paddingBottom: bottomInset + spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { fontFamily: heroFont(language) }]}>
        {prompt}
      </Text>
      <Text style={[styles.selectHint, { fontFamily: uiFont(language) }]}>
        {strings.singleSelectHint}
      </Text>
      {cardSlips}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: {
    color: colors.inkText,
    fontSize: 22,
    lineHeight: 30,
    marginBottom: spacing.sm,
  },
  selectHint: {
    color: colors.paraSoft,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  deck: { gap: spacing.sm, marginTop: spacing.md },
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
  // Tighter slip for 5-card multi rounds (fits at 375pt without scrolling usually).
  slipCompact: {
    paddingVertical: spacing.md,
    minHeight: 64,
  },
  slipOther: {
    backgroundColor: colors.ink800,
    borderBottomColor: colors.inkLine,
  },
  slipOtherExpanded: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  slipSelected: {
    borderLeftWidth: 4,
    borderLeftColor: colors.persimmon,
    transform: [{ scale: 0.98 }],
  },
  slipText: { color: colors.paraInk, fontSize: 17, lineHeight: 26 },
  slipTextCompact: { color: colors.paraInk, fontSize: 15, lineHeight: 22 },
  slipTextMuted: { color: colors.inkMuted, fontSize: 16, lineHeight: 24 },
  otherInput: {
    flex: 1,
    color: colors.paraInk,
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: 0,
  },
  otherConfirmBtn: { marginLeft: spacing.sm },
  otherConfirmText: {
    color: colors.persimmon,
    fontFamily: fonts.mono,
    fontSize: 13,
  },
  otherCancelWrap: { marginTop: spacing.md, alignItems: "center" },
  otherCancelText: { color: colors.inkMuted, fontSize: 14 },
  skipWrap: { marginTop: spacing.lg, alignItems: "center" },
  skipText: { color: colors.inkMuted, fontSize: 14 },
  multiFooter: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.inkLine,
    backgroundColor: colors.ink900,
  },
});
