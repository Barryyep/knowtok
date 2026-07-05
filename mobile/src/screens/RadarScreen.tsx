import { memo, useCallback, useRef, useState } from "react";
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { t } from "../i18n";
import { savePersonaEverywhere } from "../lib/personaService";
import { DOMAINS, domainLabel } from "../lib/taxonomy";
import type { AppLanguage, Profile } from "../lib/types";
import { PrimaryPill } from "../components/onboarding/PrimaryPill";
import { colors, fonts, radius, spacing, uiFont } from "../theme";

interface Props {
  profile: Profile;
  onSaved: (profile: Profile) => void;
  onCancel: () => void;
}

/** Snap a raw [0..1] value to the nearest 0.05 step. */
function snapWeight(raw: number): number {
  return Math.round(Math.min(1, Math.max(0, raw)) / 0.05) * 0.05;
}

/**
 * Migration helper: profiles saved before domainWeights existed carry only
 * curiosityDomains. Synthesize weights using the 1.0 / 0.8 / 0.6 / 0.45
 * decay pattern; domains not in the list get 0.
 */
function synthesizeWeights(curiosityDomains: string[]): Record<string, number> {
  const PATTERN = [1.0, 0.8, 0.6, 0.45];
  const result: Record<string, number> = {};
  for (const d of DOMAINS) result[d.id] = 0;
  curiosityDomains.forEach((id, i) => {
    if (id in result) result[id] = i < PATTERN.length ? PATTERN[i] : 0;
  });
  return result;
}

// ---------------------------------------------------------------------------
// DomainSlider — one draggable bar row
// ---------------------------------------------------------------------------

interface SliderProps {
  domainId: string;
  weight: number;
  onChangeWeight: (id: string, v: number) => void;
  language: AppLanguage;
}

const DomainSlider = memo(function DomainSlider({ domainId, weight, onChangeWeight, language }: SliderProps) {
  const trackWidth = useRef(0);
  const startX = useRef(0);
  // Use a ref so PanResponder's closure (created once) always sees the latest callback.
  const callbackRef = useRef(onChangeWeight);
  callbackRef.current = onChangeWeight;

  // PanResponder created once per component instance — stable over re-renders.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const x = Math.max(0, e.nativeEvent.locationX);
        startX.current = x;
        callbackRef.current(domainId, snapWeight(x / Math.max(trackWidth.current, 1)));
      },
      onPanResponderMove: (_, gs) => {
        const x = Math.min(trackWidth.current, Math.max(0, startX.current + gs.dx));
        callbackRef.current(domainId, snapWeight(x / Math.max(trackWidth.current, 1)));
      },
    }),
  ).current;

  const isActive = weight > 0;
  const fillPct = `${Math.round(weight * 100)}%`;

  return (
    <View style={sliderStyles.row}>
      <Text
        style={[
          sliderStyles.label,
          { fontFamily: uiFont(language) },
          !isActive && sliderStyles.labelMuted,
        ]}
        numberOfLines={1}
      >
        {domainLabel(domainId, language)}
      </Text>
      {/* Larger vertical hit area wrapping the thin visual track */}
      <View
        style={sliderStyles.trackHitArea}
        {...panResponder.panHandlers}
        onLayout={(e) => {
          trackWidth.current = e.nativeEvent.layout.width;
        }}
      >
        <View
          style={[
            sliderStyles.track,
            !isActive && sliderStyles.trackInactive,
          ]}
          pointerEvents="none"
        >
          <View style={[sliderStyles.fill, { width: fillPct as any }]} />
        </View>
      </View>
    </View>
  );
});

const sliderStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm + 2,
  },
  label: {
    color: colors.inkText,
    fontSize: 14,
    width: 96,
    flexShrink: 0,
  },
  labelMuted: {
    color: colors.inkMuted,
  },
  trackHitArea: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 10,
  },
  track: {
    height: 6,
    backgroundColor: colors.paperEdge,
    borderRadius: 3,
    overflow: "hidden",
  },
  trackInactive: {
    backgroundColor: colors.inkLine,
  },
  fill: {
    height: 6,
    backgroundColor: colors.persimmon,
    borderRadius: 3,
  },
});

// ---------------------------------------------------------------------------
// RadarScreen
// ---------------------------------------------------------------------------

export function RadarScreen({ profile, onSaved, onCancel }: Props) {
  const insets = useSafeAreaInsets();
  const strings = t(profile.language);
  const ui = (w?: "regular" | "medium" | "semibold" | "bold") =>
    uiFont(profile.language, w);

  // Initialize weights: prefer stored domainWeights; fall back to migration.
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    if (profile.domainWeights) {
      const w: Record<string, number> = {};
      for (const d of DOMAINS) w[d.id] = profile.domainWeights[d.id] ?? 0;
      return w;
    }
    return synthesizeWeights(profile.curiosityDomains ?? []);
  });

  const [showGuardHint, setShowGuardHint] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleWeightChange = useCallback((id: string, v: number) => {
    setWeights((prev) => {
      const next = { ...prev, [id]: v };
      const activeCount = Object.values(next).filter((w) => w > 0).length;
      if (activeCount < 2) {
        setShowGuardHint(true);
        return prev; // block — keep current state
      }
      setShowGuardHint(false);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Drop zero-weight entries.
      const cleanWeights: Record<string, number> = {};
      for (const [id, w] of Object.entries(weights)) {
        if (w > 0) cleanWeights[id] = w;
      }
      const sorted = Object.entries(cleanWeights)
        .sort(([, a], [, b]) => b - a)
        .map(([id]) => id);
      const updated: Profile = {
        ...profile,
        domainWeights: cleanWeights,
        curiosityDomains: sorted,
      };
      await savePersonaEverywhere(updated);
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }, [weights, profile, onSaved]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, padding: spacing.lg }}
      >
        {/* Back */}
        <Pressable style={styles.backRow} onPress={onCancel}>
          <Text style={[styles.backText, { fontFamily: ui() }]}>
            {profile.language === "zh" ? "‹ 返回" : "‹ Back"}
          </Text>
        </Pressable>

        {/* Header */}
        <Text style={styles.eyebrow}>OHLO · DAILY DISPATCH</Text>
        <Text style={[styles.heading, { fontFamily: ui("bold") }]}>
          {strings.radarScreenTitle}
        </Text>

        {/* Domain sliders */}
        <View style={styles.domainCard}>
          {DOMAINS.map((d) => (
            <DomainSlider
              key={d.id}
              domainId={d.id}
              weight={weights[d.id] ?? 0}
              onChangeWeight={handleWeightChange}
              language={profile.language}
            />
          ))}
        </View>

        {showGuardHint && (
          <Text style={[styles.guardHint, { fontFamily: ui() }]}>
            {strings.radarGuardHint}
          </Text>
        )}
      </ScrollView>

      {/* Pinned footer: footnote + save CTA */}
      <View
        style={[
          styles.footer,
          { paddingBottom: insets.bottom + spacing.sm },
        ]}
      >
        <Text style={[styles.footnote, { fontFamily: ui() }]}>
          {strings.revealFootnote}
        </Text>
        <PrimaryPill
          label={strings.save}
          language={profile.language}
          onPress={() => {
            void handleSave();
          }}
          busy={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink900 },
  scroll: { flex: 1 },
  backRow: { marginBottom: spacing.sm },
  backText: { color: colors.inkMuted, fontSize: 14 },
  eyebrow: {
    color: colors.marigold,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  heading: {
    color: colors.inkText,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: spacing.lg,
  },
  domainCard: {
    backgroundColor: colors.ink800,
    borderColor: colors.inkLine,
    borderWidth: 1,
    borderRadius: radius.slip,
    padding: spacing.md,
  },
  guardHint: {
    color: colors.marigold,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.inkLine,
    gap: spacing.sm,
  },
  footnote: {
    color: colors.inkMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
});
