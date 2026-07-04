import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import { systemLanguage, t } from "../i18n";
import { savePersonaEverywhere } from "../lib/personaService";
import { SPARKS } from "../lib/taxonomy";
import type { AppLanguage, Profile } from "../lib/types";
import { colors, spacing, uiFont } from "../theme";
import { AboutStep } from "../components/onboarding/AboutStep";
import { CuriosityStep } from "../components/onboarding/CuriosityStep";
import { PreferencesStep } from "../components/onboarding/PreferencesStep";
import { ProgressDots } from "../components/onboarding/ProgressDots";

interface Props {
  initial: Profile | null;
  /** First-run setup shows the big CTA; from Settings it's just "Save". */
  isFirstRun: boolean;
  onSaved: (profile: Profile) => void;
  /** Back affordance when opened from Settings (absent on first run). */
  onCancel?: () => void;
}

const TOTAL_STEPS = 3;

/** All SPARKS indices whose domain is already in the persona's curiosity set. */
function initialSelection(domains: string[]): Set<number> {
  const set = new Set<number>();
  SPARKS.forEach((spark, i) => {
    if (domains.includes(spark.domainId)) set.add(i);
  });
  return set;
}

/**
 * The multi-step curiosity onboarding. Instead of collecting form fields, it
 * captures the user's curiosity spot: which real hooks they'd actually open.
 *
 * Step 1 好奇心测定 (the core) → Step 2 这是写给谁的信 → Step 3 收信偏好.
 * Editing from Settings pre-fills every step from the existing persona.
 */
export function ProfileScreen({ initial, isFirstRun, onSaved, onCancel }: Props) {
  const [profile, setProfile] = useState<Profile>(
    initial ?? {
      name: "",
      occupation: "",
      interests: "",
      curiosityDomains: [],
      language: systemLanguage(),
    },
  );
  const [selected, setSelected] = useState<Set<number>>(() =>
    initialSelection(initial?.curiosityDomains ?? []),
  );
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const strings = t(profile.language);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  // Distinct domains lit by the current spark selection — the real signal.
  const derivedDomains = useMemo(() => {
    const seen: string[] = [];
    for (const i of selected) {
      const id = SPARKS[i]?.domainId;
      if (id && !seen.includes(id)) seen.push(id);
    }
    return seen;
  }, [selected]);

  const toggleSpark = useCallback((index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  // 落信 — replay the mail-arrival motion (translateY+opacity, 180ms) on each
  // step transition so the flow keeps the dispatch vocabulary.
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [anim, step]);

  const motion = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  };

  const goBack = () => {
    if (step > 0) {
      setError(null);
      setStep((s) => s - 1);
    } else {
      onCancel?.();
    }
  };

  const leaveCuriosity = () => {
    setError(null);
    setStep(1);
  };

  const leaveAbout = () => {
    if (!profile.occupation.trim() && !profile.interests.trim()) {
      setError(strings.needProfile);
      return;
    }
    setError(null);
    setStep(2);
  };

  const finish = async () => {
    setBusy(true);
    const finalProfile: Profile = { ...profile, curiosityDomains: derivedDomains };
    await savePersonaEverywhere(finalProfile);
    setBusy(false);
    onSaved(finalProfile);
  };

  const showBack = step > 0 || !!onCancel;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.chrome, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.chromeSide}>
          {showBack && (
            <Pressable onPress={goBack} hitSlop={12} style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color={colors.marigold} />
              <Text style={[styles.backText, { fontFamily: uiFont(profile.language) }]}>
                {strings.stepBack}
              </Text>
            </Pressable>
          )}
        </View>
        <ProgressDots current={step} total={TOTAL_STEPS} />
        <View style={styles.chromeSide} />
      </View>

      <Animated.View style={[styles.stepArea, motion]}>
        {step === 0 && (
          <CuriosityStep
            language={profile.language}
            selected={selected}
            onToggle={toggleSpark}
            derivedDomains={derivedDomains}
            onContinue={leaveCuriosity}
            bottomInset={insets.bottom}
          />
        )}
        {step === 1 && (
          <AboutStep
            language={profile.language}
            name={profile.name}
            occupation={profile.occupation}
            interests={profile.interests}
            onChangeName={(v) => set("name", v)}
            onChangeOccupation={(v) => set("occupation", v)}
            onChangeInterests={(v) => set("interests", v)}
            error={error}
            onContinue={leaveAbout}
            bottomInset={insets.bottom}
          />
        )}
        {step === 2 && (
          <PreferencesStep
            language={profile.language}
            ageRange={profile.ageRange}
            onChangeAgeRange={(v) => set("ageRange", v)}
            onChangeLanguage={(v: AppLanguage) => set("language", v)}
            busy={busy}
            onFinish={() => void finish()}
            bottomInset={insets.bottom}
          />
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink900 },
  chrome: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  // Equal-width sides keep the progress dots optically centered regardless of
  // whether the back chevron is present.
  chromeSide: { width: 64 },
  backButton: { flexDirection: "row", alignItems: "center", marginLeft: -6 },
  backText: { color: colors.marigold, fontSize: 15 },
  stepArea: { flex: 1 },
});
