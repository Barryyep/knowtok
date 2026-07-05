import { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import { systemLanguage, t } from "../i18n";
import {
  QUIZ_SEQUENCE,
  applyCardPick,
  applyChoice,
  dealRound,
  initialQuizState,
  quizResult,
} from "../lib/quiz";
import type { QuizItem, QuizOption, QuizState } from "../lib/quiz";
import { savePersonaEverywhere } from "../lib/personaService";
import type { Spark } from "../lib/taxonomy";
import type { AppLanguage, Profile } from "../lib/types";
import { colors, fonts, heroFont, paperBodyFont, radius, spacing, uiFont } from "../theme";
import { PrimaryPill } from "../components/onboarding/PrimaryPill";
import { QuizStep } from "../components/onboarding/QuizStep";
import { RevealStep } from "../components/onboarding/RevealStep";

// ─── Flow constants ───────────────────────────────────────────────────────────
const REVEAL_STAGE = QUIZ_SEQUENCE.length; // 16
const TOTAL_STAGES = QUIZ_SEQUENCE.length + 1; // 17

// ─── History entry (for back navigation) ─────────────────────────────────────
interface HistoryEntry {
  stageIndex: number;
  quizState: QuizState;
  profileDraft: Profile;
  cardTrio: Spark[] | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  initial: Profile | null;
  isFirstRun: boolean;
  onSaved: (profile: Profile) => void;
  onCancel?: () => void;
}

// ─── ProfileScreen ────────────────────────────────────────────────────────────
export function ProfileScreen({ initial, isFirstRun, onSaved, onCancel }: Props) {
  const insets = useSafeAreaInsets();

  const [stageIndex, setStageIndex] = useState(0);
  const [quizState, setQuizState] = useState<QuizState>(initialQuizState);
  const [profileDraft, setProfileDraft] = useState<Profile>({
    name: initial?.name ?? "",
    occupation: "",
    interests: "",
    curiosityDomains: [],
    language: initial?.language ?? systemLanguage(),
  });
  const [cardTrio, setCardTrio] = useState<Spark[] | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);

  // ─── Transition animations ───────────────────────────────────────────────
  const exitAnim = useRef(new Animated.Value(1)).current; // 1=visible, 0=exited
  const enterAnim = useRef(new Animated.Value(1)).current; // 0=pre-enter, 1=entered
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STAGES)).current;

  // Combined style values (using `as any` to avoid AnimatedMultiplication/Addition type conflicts)
  const combinedOpacity = Animated.multiply(exitAnim, enterAnim);
  const combinedTranslateY = Animated.add(
    exitAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }),
    enterAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
  );
  const motionStyle = {
    opacity: combinedOpacity as any,
    transform: [{ translateY: combinedTranslateY as any }],
  };

  const progressFillWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  // ─── Transition engine ───────────────────────────────────────────────────
  const doTransition = (updatesFn: () => void, newProgress: number) => {
    Animated.timing(exitAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      enterAnim.setValue(0);
      updatesFn();
      exitAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: newProgress,
        duration: 200,
        useNativeDriver: false,
      }).start();
      Animated.timing(enterAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  };

  const advanceToStage = (
    nextIndex: number,
    newState: QuizState,
    newProfile: Profile,
    skipHistory = false,
  ) => {
    let finalState = newState;
    let finalTrio: Spark[] | null = null;

    // Pre-deal when the next stage is a cards round.
    if (nextIndex < QUIZ_SEQUENCE.length) {
      const nextItem = QUIZ_SEQUENCE[nextIndex];
      if (nextItem && nextItem.kind === "cards") {
        const dealt = dealRound(newState, nextItem.round);
        finalState = dealt.state;
        finalTrio = dealt.trio;
      }
    }

    const newProgress = (nextIndex + 1) / TOTAL_STAGES;
    const entry: HistoryEntry = { stageIndex, quizState, profileDraft, cardTrio };

    doTransition(() => {
      if (!skipHistory) {
        setHistory((h) => [...h, entry]);
      }
      setStageIndex(nextIndex);
      setQuizState(finalState);
      setProfileDraft(newProfile);
      setCardTrio(finalTrio);
    }, newProgress);
  };

  const handleBack = () => {
    if (history.length === 0) {
      onCancel?.();
      return;
    }
    const prev = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    const newProgress = (prev.stageIndex + 1) / TOTAL_STAGES;
    doTransition(() => {
      setHistory(newHistory);
      setStageIndex(prev.stageIndex);
      setQuizState(prev.quizState);
      setProfileDraft(prev.profileDraft);
      setCardTrio(prev.cardTrio);
    }, newProgress);
  };

  const handleFinish = async () => {
    setBusy(true);
    const result = quizResult(quizState);
    const finalProfile: Profile = {
      ...profileDraft,
      curiosityDomains: result.domains.map((d) => d.id),
      domainWeights: Object.fromEntries(result.domains.map((d) => [d.id, d.strength])),
      interests: result.style,
    };
    await savePersonaEverywhere(finalProfile);
    setBusy(false);
    onSaved(finalProfile);
  };

  // ─── Chrome visibility ───────────────────────────────────────────────────
  const currentItem: QuizItem | null =
    stageIndex < QUIZ_SEQUENCE.length ? QUIZ_SEQUENCE[stageIndex] ?? null : null;
  const isNote = currentItem?.kind === "note";
  const showBack = !isNote && (history.length > 0 || !!onCancel);

  const strings = t(profileDraft.language);

  // ─── Choice callback ─────────────────────────────────────────────────────
  const handleChoicePick = (option: QuizOption) => {
    if (currentItem?.kind !== "choice") return;
    const newState = applyChoice(quizState, option);
    const newProfile: Profile = { ...profileDraft };
    if (option.momentVote) newProfile.readingMoment = option.momentVote;
    if (option.occupationVote) newProfile.occupation = option.occupationVote;
    advanceToStage(stageIndex + 1, newState, newProfile);
  };

  const handleChoiceSkip = () => {
    if (currentItem?.kind !== "choice") return;
    const newProfile: Profile = {
      ...profileDraft,
      occupation: currentItem.id === "days" ? "other" : profileDraft.occupation,
    };
    advanceToStage(stageIndex + 1, quizState, newProfile);
  };

  // ─── Card callback ───────────────────────────────────────────────────────
  const handleCardPick = (domainId: string) => {
    if (currentItem?.kind !== "cards") return;
    const newState = applyCardPick(quizState, domainId, currentItem.round);
    advanceToStage(stageIndex + 1, newState, profileDraft);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {!isNote && (
        <View style={[styles.chrome, { paddingTop: insets.top + spacing.sm }]}>
          <View style={styles.chromeSide}>
            {showBack && (
              <Pressable onPress={handleBack} hitSlop={12} style={styles.backButton}>
                <Ionicons name="chevron-back" size={22} color={colors.marigold} />
                <Text
                  style={[styles.backText, { fontFamily: uiFont(profileDraft.language) }]}
                >
                  {strings.stepBack}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: progressFillWidth as any },
              ]}
            />
          </View>

          <View style={styles.chromeSide} />
        </View>
      )}

      <Animated.View style={[styles.stepArea, motionStyle]}>
        {/* ── Reveal ──────────────────────────────────────────────────── */}
        {stageIndex === REVEAL_STAGE && (
          <RevealStep
            key="reveal"
            language={profileDraft.language}
            profile={profileDraft}
            result={quizResult(quizState)}
            busy={busy}
            onFinish={() => void handleFinish()}
            bottomInset={insets.bottom}
          />
        )}

        {/* ── Name ────────────────────────────────────────────────────── */}
        {currentItem?.kind === "name" && (
          <NameStep
            key={stageIndex}
            language={profileDraft.language}
            initialName={profileDraft.name}
            onContinue={(name) =>
              advanceToStage(REVEAL_STAGE, quizState, { ...profileDraft, name })
            }
            bottomInset={insets.bottom}
          />
        )}

        {/* ── Note ────────────────────────────────────────────────────── */}
        {currentItem?.kind === "note" && (
          <NoteInterstitial
            key={stageIndex}
            item={currentItem}
            language={profileDraft.language}
            onDone={() =>
              advanceToStage(stageIndex + 1, quizState, profileDraft, true)
            }
          />
        )}

        {/* ── Choice ──────────────────────────────────────────────────── */}
        {currentItem?.kind === "choice" && (
          <QuizStep
            key={stageIndex}
            item={currentItem}
            language={profileDraft.language}
            onChoicePick={handleChoicePick}
            onSkip={currentItem.skippable ? handleChoiceSkip : undefined}
            bottomInset={insets.bottom}
          />
        )}

        {/* ── Cards ───────────────────────────────────────────────────── */}
        {currentItem?.kind === "cards" && cardTrio !== null && (
          <QuizStep
            key={stageIndex}
            item={currentItem}
            language={profileDraft.language}
            cardTrio={cardTrio}
            onCardPick={handleCardPick}
            bottomInset={insets.bottom}
          />
        )}

        {/* ── Age ─────────────────────────────────────────────────────── */}
        {currentItem?.kind === "age" && (
          <AgeStep
            key={stageIndex}
            language={profileDraft.language}
            ageRange={profileDraft.ageRange}
            onAgeChange={(range) =>
              setProfileDraft((p) => ({ ...p, ageRange: range }))
            }
            onContinue={() => advanceToStage(stageIndex + 1, quizState, profileDraft)}
            bottomInset={insets.bottom}
          />
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ─── NameStep ─────────────────────────────────────────────────────────────────
function NameStep({
  language,
  initialName,
  onContinue,
  bottomInset,
}: {
  language: AppLanguage;
  initialName: string;
  onContinue: (name: string) => void;
  bottomInset: number;
}) {
  const [name, setName] = useState(initialName);
  const strings = t(language);

  return (
    <View style={nameStyles.root}>
      <ScrollView
        style={nameStyles.scroll}
        contentContainerStyle={nameStyles.scrollBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={nameStyles.eyebrow}>OHLO · DAILY DISPATCH</Text>
        <Text style={[nameStyles.title, { fontFamily: heroFont(language) }]}>
          {strings.nameTitle}
        </Text>
        <Text style={[nameStyles.subtitle, { fontFamily: uiFont(language) }]}>
          {strings.nameSubtitle}
        </Text>
        <TextInput
          style={[nameStyles.input, { fontFamily: paperBodyFont(language) }]}
          value={name}
          onChangeText={setName}
          autoFocus
          placeholder=""
          placeholderTextColor={colors.paraSoft}
          returnKeyType="done"
          onSubmitEditing={() => onContinue(name)}
          selectionColor={colors.persimmon}
        />
      </ScrollView>

      <View style={[nameStyles.footer, { paddingBottom: bottomInset + spacing.md }]}>
        <PrimaryPill
          label={strings.continueLabel}
          language={language}
          onPress={() => onContinue(name)}
        />
      </View>
    </View>
  );
}

const nameStyles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
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
    fontSize: 26,
    lineHeight: 34,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 15,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.paper0,
    borderRadius: radius.slip,
    borderBottomWidth: 3,
    borderBottomColor: colors.paperEdge,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    color: colors.paraInk,
    fontSize: 18,
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.inkLine,
    backgroundColor: colors.ink900,
    gap: spacing.sm,
  },
  skipWrap: { alignItems: "center", paddingVertical: spacing.xs },
  skipText: { color: colors.inkMuted, fontSize: 14 },
});

// ─── NoteInterstitial ─────────────────────────────────────────────────────────
function NoteInterstitial({
  item,
  language,
  onDone,
}: {
  item: Extract<QuizItem, { kind: "note" }>;
  language: AppLanguage;
  onDone: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const didAdvance = useRef(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      if (!didAdvance.current) {
        didAdvance.current = true;
        onDone();
      }
    }, 1500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = () => {
    if (didAdvance.current) return;
    didAdvance.current = true;
    onDone();
  };

  return (
    <Pressable style={noteStyles.root} onPress={handlePress}>
      <Animated.View style={[noteStyles.content, { opacity: fadeAnim }]}>
        <Text style={noteStyles.text}>{item[language]}</Text>
      </Animated.View>
    </Pressable>
  );
}

const noteStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ink900,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  content: { alignItems: "center" },
  text: {
    fontFamily: fonts.mono,
    color: colors.inkText,
    fontSize: 18,
    lineHeight: 28,
    textAlign: "center",
  },
});

// ─── AgeStep ──────────────────────────────────────────────────────────────────
const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55+"];

function AgeStep({
  language,
  ageRange,
  onAgeChange,
  onContinue,
  bottomInset,
}: {
  language: AppLanguage;
  ageRange?: string;
  onAgeChange: (v: string | undefined) => void;
  onContinue: () => void;
  bottomInset: number;
}) {
  const strings = t(language);
  const [ratherNotSay, setRatherNotSay] = useState(false);

  const handleRangePress = (range: string) => {
    setRatherNotSay(false);
    onAgeChange(ageRange === range ? undefined : range);
  };

  const handleRatherNotSay = () => {
    const next = !ratherNotSay;
    setRatherNotSay(next);
    if (next) onAgeChange(undefined);
  };

  return (
    <View style={ageStyles.root}>
      <ScrollView
        style={ageStyles.scroll}
        contentContainerStyle={ageStyles.scrollBody}
        showsVerticalScrollIndicator={false}
      >
        <Text style={ageStyles.eyebrow}>OHLO · DAILY DISPATCH</Text>
        <Text style={[ageStyles.title, { fontFamily: heroFont(language) }]}>
          {strings.ageTitle}
        </Text>
        <Text style={[ageStyles.subtitle, { fontFamily: uiFont(language) }]}>
          {strings.ageSubtitle}
        </Text>

        <View style={ageStyles.chipWrap}>
          {AGE_RANGES.map((range) => {
            const active = ageRange === range && !ratherNotSay;
            return (
              <Pressable
                key={range}
                onPress={() => handleRangePress(range)}
                style={[ageStyles.chip, active && ageStyles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    ageStyles.chipText,
                    active && ageStyles.chipTextActive,
                    { fontFamily: uiFont(language, "medium") },
                  ]}
                >
                  {range}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={handleRatherNotSay}
            style={[ageStyles.chip, ratherNotSay && ageStyles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: ratherNotSay }}
          >
            <Text
              style={[
                ageStyles.chipText,
                ratherNotSay && ageStyles.chipTextActive,
                { fontFamily: uiFont(language, "medium") },
              ]}
            >
              {strings.ageRatherNotSay}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={[ageStyles.footer, { paddingBottom: bottomInset + spacing.md }]}>
        <PrimaryPill
          label={strings.continueLabel}
          language={language}
          onPress={onContinue}
        />
      </View>
    </View>
  );
}

const ageStyles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
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
    fontSize: 26,
    lineHeight: 34,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 15,
    marginBottom: spacing.lg,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderColor: colors.inkLine,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
  },
  chipActive: { backgroundColor: colors.persimmon, borderColor: colors.persimmon },
  chipText: { color: colors.inkText, fontSize: 15 },
  chipTextActive: { color: colors.paper0 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.inkLine,
    backgroundColor: colors.ink900,
    gap: spacing.sm,
  },
  skipWrap: { alignItems: "center", paddingVertical: spacing.xs },
  skipText: { color: colors.inkMuted, fontSize: 14 },
});

// ─── ProfileScreen styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink900 },
  chrome: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  chromeSide: { width: 64 },
  backButton: { flexDirection: "row", alignItems: "center", marginLeft: -6 },
  backText: { color: colors.marigold, fontSize: 15 },
  progressTrack: {
    flex: 1,
    height: 2,
    backgroundColor: colors.inkMuted,
    borderRadius: 1,
    overflow: "hidden",
    marginHorizontal: spacing.sm,
  },
  progressFill: {
    height: 2,
    backgroundColor: colors.marigold,
  },
  stepArea: { flex: 1 },
});
