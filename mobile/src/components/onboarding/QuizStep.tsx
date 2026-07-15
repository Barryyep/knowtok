import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
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
import { useKeyboardHeight } from "../../lib/useKeyboardHeight";
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
  const otherInputRef = useRef<TextInput>(null);
  const keyboardHeight = useKeyboardHeight();

  // Deliberately NOT autoFocus. autoFocus fires TextInput.focus() (and
  // therefore the keyboard-show event) synchronously on mount, before
  // KeyboardAvoidingView has finished its own layout measurement — on this
  // app's React Native 0.86 / Expo SDK 57 (New Architecture / Fabric) that
  // race made the whole screen render blank the instant the keyboard
  // started rising, while staying fully interactive underneath (confirmed:
  // typing and buttons kept working). Focusing manually, one frame after
  // the modal has mounted and settled, avoids triggering the keyboard
  // before that measurement is done.
  useEffect(() => {
    if (!otherExpanded) return;
    const id = requestAnimationFrame(() => otherInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [otherExpanded]);

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

  // 「其他」 free-text entry, rendered as a Modal — see the comment above the
  // JSX below for why.
  const otherModal = item.kind === "choice" && item.allowOther && (
    <Modal
      visible={otherExpanded}
      animationType="slide"
      transparent
      onRequestClose={() => {
        setOtherExpanded(false);
        setOtherText("");
      }}
    >
      {/*
        Not KeyboardAvoidingView — see useKeyboardHeight's doc comment.
        Its internal onLayout-based frame measurement is the actual root
        cause found after six attempts (this Modal was itself one of
        them, and still reproduced the bug with its own separate
        KeyboardAvoidingView instance, ruling out ProfileScreen's outer
        stack as the cause). keyboardHeight is driven directly by the
        OS keyboard event instead.
      */}
      <View style={[otherPanelStyles.overlay, { paddingBottom: keyboardHeight }]}>
        <Pressable
          style={otherPanelStyles.scrim}
          onPress={() => {
            setOtherExpanded(false);
            setOtherText("");
          }}
        />
        <View style={otherPanelStyles.sheet}>
          <Text style={[otherPanelStyles.title, { fontFamily: heroFont(language) }]}>
            {item.kind === "choice" ? item[language] : ""}
          </Text>
          <View style={otherPanelStyles.inputRow}>
            <TextInput
              ref={otherInputRef}
              style={[otherPanelStyles.input, { fontFamily: heroFont(language) }]}
              value={otherText}
              onChangeText={setOtherText}
              maxLength={120}
              placeholder={strings.otherPlaceholder}
              placeholderTextColor={otherPanelStyles.placeholder.color as string}
              returnKeyType="done"
              onSubmitEditing={handleOtherConfirm}
            />
          </View>
          <Pressable onPress={handleOtherConfirm} style={otherPanelStyles.confirmBtn} hitSlop={8}>
            <Text style={[otherPanelStyles.confirmText, { fontFamily: uiFont(language) }]}>
              {strings.otherConfirm}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setOtherExpanded(false);
              setOtherText("");
            }}
            style={otherPanelStyles.cancelWrap}
            hitSlop={8}
          >
            <Text style={[otherPanelStyles.cancelText, { fontFamily: uiFont(language) }]}>
              {strings.otherCancel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  // ── Choice ───────────────────────────────────────────────────────────────────
  if (item.kind === "choice") {
    return (
      <>
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

            {item.allowOther && (
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
          </View>

          {item.skippable && (
            <Pressable onPress={onSkip} style={styles.skipWrap}>
              <Text style={[styles.skipText, { fontFamily: uiFont(language) }]}>{strings.skipLabel}</Text>
            </Pressable>
          )}
        </ScrollView>
        {otherModal}
      </>
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
  slipSelected: {
    borderLeftWidth: 4,
    borderLeftColor: colors.persimmon,
    transform: [{ scale: 0.98 }],
  },
  slipText: { color: colors.paraInk, fontSize: 17, lineHeight: 26 },
  slipTextCompact: { color: colors.paraInk, fontSize: 15, lineHeight: 22 },
  slipTextMuted: { color: colors.inkMuted, fontSize: 16, lineHeight: 24 },
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

// Fully separate from `styles` above — see the comment on the 其他-expanded
// render branch for why. Explicit backgroundColor on the root and no
// centering/flex tricks: a flat, top-anchored column that can't collapse.
const otherPanelStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  scrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: colors.ink900,
    borderTopLeftRadius: radius.slip,
    borderTopRightRadius: radius.slip,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    color: colors.inkText,
    fontSize: 22,
    lineHeight: 30,
    marginBottom: spacing.lg,
  },
  inputRow: {
    backgroundColor: colors.paper0,
    borderRadius: radius.slip,
    borderBottomWidth: 3,
    borderBottomColor: colors.paperEdge,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 56,
    justifyContent: "center",
  },
  input: {
    color: colors.paraInk,
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: 0,
  },
  placeholder: { color: colors.paraSoft },
  confirmBtn: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.persimmon,
  },
  confirmText: { color: colors.paper0, fontSize: 15 },
  cancelWrap: { marginTop: spacing.lg, alignItems: "flex-start" },
  cancelText: { color: colors.inkMuted, fontSize: 14 },
});
