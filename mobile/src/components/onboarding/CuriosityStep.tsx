import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../../i18n";
import { domainLabel, SPARKS } from "../../lib/taxonomy";
import type { AppLanguage } from "../../lib/types";
import { colors, fonts, heroFont, radius, spacing, uiFont } from "../../theme";
import { PrimaryPill } from "./PrimaryPill";

interface Props {
  language: AppLanguage;
  /** Indices into SPARKS that are currently lit. */
  selected: Set<number>;
  onToggle: (index: number) => void;
  /** Distinct domain ids derived from the selected sparks. */
  derivedDomains: string[];
  onContinue: () => void;
  /** Safe-area bottom inset, applied under the pinned footer. */
  bottomInset: number;
}

/**
 * 好奇心测定 — the core step. The SPARKS deck renders as tappable cream
 * mini-slips; tapping one lights its domain. We don't ask "what topics do you
 * like", we watch what the user would actually open. Gate: ≥2 distinct domains.
 */
export function CuriosityStep({
  language,
  selected,
  onToggle,
  derivedDomains,
  onContinue,
  bottomInset,
}: Props) {
  const strings = t(language);
  const canContinue = derivedDomains.length >= 2;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>OHLO · DAILY DISPATCH</Text>
        <Text style={[styles.title, { fontFamily: uiFont(language, "bold") }]}>
          {strings.curiosityTitle}
        </Text>
        <Text style={[styles.subtitle, { fontFamily: uiFont(language) }]}>
          {strings.curiositySubtitle}
        </Text>

        <View style={styles.deck}>
          {SPARKS.map((spark, i) => {
            const isOn = selected.has(i);
            return (
              <Pressable
                key={i}
                style={[styles.slip, isOn && styles.slipOn]}
                onPress={() => onToggle(i)}
                accessibilityRole="button"
                accessibilityState={{ selected: isOn }}
              >
                <Text
                  style={[styles.sparkText, { fontFamily: heroFont(language) }]}
                  numberOfLines={3}
                >
                  {spark[language]}
                </Text>
                {isOn && (
                  <View style={styles.check}>
                    <Text style={styles.checkMark}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomInset + spacing.md }]}>
        <Text style={[styles.domainsLead, { fontFamily: uiFont(language) }]}>
          {strings.curiosityDomainsLead}
        </Text>
        <View style={styles.chipStrip}>
          {derivedDomains.length === 0 ? (
            <Text style={[styles.chipPlaceholder, { fontFamily: uiFont(language) }]}>—</Text>
          ) : (
            derivedDomains.map((id) => (
              <View key={id} style={styles.chip}>
                <Text style={[styles.chipText, { fontFamily: uiFont(language, "medium") }]}>
                  {domainLabel(id, language)}
                </Text>
              </View>
            ))
          )}
        </View>

        {!canContinue && (
          <Text style={[styles.gateHint, { fontFamily: uiFont(language) }]}>
            {strings.curiosityGateHint}
          </Text>
        )}

        <View style={styles.pillWrap}>
          <PrimaryPill
            label={strings.continueLabel}
            language={language}
            onPress={onContinue}
            disabled={!canContinue}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollBody: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  eyebrow: {
    color: colors.marigold,
    fontFamily: fonts.mono,
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  title: { color: colors.inkText, fontSize: 26, fontWeight: "700", lineHeight: 34 },
  subtitle: {
    color: colors.inkMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  deck: { gap: spacing.sm },
  // A mini cream slip — compact, hero-typeset, fold-edge on the bottom.
  slip: {
    backgroundColor: colors.paper0,
    borderRadius: radius.slip,
    borderBottomWidth: 3,
    borderBottomColor: colors.paperEdge,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingRight: spacing.xl + spacing.sm, // room for the ✓ seal
  },
  // Selected: persimmon left seal-edge (the "premium slip" tell).
  slipOn: { borderLeftWidth: 4, borderLeftColor: colors.persimmon },
  sparkText: { color: colors.paraInk, fontSize: 16, lineHeight: 24 },
  check: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.persimmon,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { color: colors.paper0, fontSize: 13, fontWeight: "700", lineHeight: 16 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.inkLine,
    backgroundColor: colors.ink900,
  },
  domainsLead: {
    color: colors.inkMuted,
    fontSize: 12,
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
  },
  chipStrip: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, minHeight: 30 },
  chipPlaceholder: { color: colors.inkMuted, fontSize: 14 },
  chip: {
    backgroundColor: colors.marigold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  chipText: { color: colors.ink900, fontSize: 13, fontWeight: "600" },
  gateHint: {
    color: colors.inkMuted,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  pillWrap: { marginTop: spacing.md },
});
