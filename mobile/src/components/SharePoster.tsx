import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

// Import from the pure-JS core path to avoid node builtins (fs/stream/canvas)
// that the root qrcode/index.js pulls in via the server-side renderer.
import { create as qrCodeCreate } from "qrcode/lib/core/qrcode";

import { t } from "../i18n";
import { buildShareUrl } from "../lib/shareUrl";
import type { AppLanguage, DailyFact } from "../lib/types";
import { colors, fonts, heroFont, radius, spacing, uiFont } from "../theme";
import { DatePostmark } from "./DatePostmark";
import { formatDispatch } from "./slipUtils";

interface Props {
  fact: DailyFact;
  language: AppLanguage;
}

/** Fixed poster dimensions: 340×510 logical px (2:3 portrait). */
export const POSTER_W = 340;
export const POSTER_H = 510;

const BACKDROP_PAD = spacing.md; // 16 — ink900 frame
const SLIP_PAD = 20; // inner slip padding
const QR_BOX = 72; // total QR tile size in logical pts
const QR_QUIET = 3; // quiet-zone padding inside the tile

/** Pure-JS QR code rendered as a grid of <View> squares. */
function QRGrid({ url }: { url: string }) {
  const matrix = useMemo(() => {
    try {
      return qrCodeCreate(url, { errorCorrectionLevel: "M" });
    } catch {
      return null;
    }
  }, [url]);

  if (!matrix) {
    return (
      <View style={{ width: QR_BOX, height: QR_BOX, backgroundColor: colors.paper0 }} />
    );
  }

  const { data, size } = matrix.modules;
  const modSize = (QR_BOX - QR_QUIET * 2) / size;

  return (
    <View
      style={{
        width: QR_BOX,
        height: QR_BOX,
        backgroundColor: colors.paper0,
        padding: QR_QUIET,
      }}
    >
      {Array.from({ length: size }, (_, row) => (
        <View key={row} style={{ flexDirection: "row" }}>
          {Array.from({ length: size }, (_, col) => (
            <View
              key={col}
              style={{
                width: modSize,
                height: modSize,
                backgroundColor:
                  data[row * size + col] !== 0 ? colors.paraInk : colors.paper0,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Fixed-size 340×510 share poster in the Daily Dispatch aesthetic.
 * Rendered off-screen and captured via react-native-view-shot.
 * Capture at pixelRatio 3 (pass width: 1020, height: 1530 to ViewShot
 * options in TodayScreen) for a crisp ~1020×1530 PNG.
 */
export function SharePoster({ fact, language }: Props) {
  const strings = t(language);
  const isPaper = fact.source.kind === "paper";
  const shareUrl = useMemo(() => buildShareUrl(fact), [fact]);
  // source.label carries the publish date for paper-track facts
  // (e.g. "arXiv:2507.01234 · 2026-07-01"); general facts carry no date.
  const stampText = fact.source.label;

  return (
    <View style={styles.backdrop}>
      <View style={[styles.slip, isPaper && styles.slipPaper]}>
        {/* ── Top group: header · seal/topic · hero fact ── */}
        <View>
          {/* Header row: dispatch № left, dated cancellation mark right */}
          <View style={styles.headerRow}>
            <Text style={styles.dispatch}>
              {formatDispatch(fact.source.factId)}
            </Text>
            <DatePostmark date={fact.date} size={78} />
          </View>

          {/* Seal row: FIRST CLASS seal (paper) or topic label (general) */}
          <View style={styles.sealRow}>
            {isPaper ? (
              <View style={styles.seal}>
                <Text style={styles.sealText}>{strings.firstClassSeal}</Text>
              </View>
            ) : (
              <Text style={styles.topicText} numberOfLines={1}>
                {fact.topic}
              </Text>
            )}
          </View>

          {/* Hero fact — the star of the poster */}
          <Text style={[styles.heroText, { fontFamily: heroFont(language) }]}>
            {fact.fact}
          </Text>
        </View>

        {/* ── Bottom group: divider · stamp · QR row ── */}
        <View>
          <View style={styles.dashed} />

          {/* Source stamp — tilted -1.2° for hand-stamped feel */}
          <View style={styles.stampRow}>
            <View style={styles.stamp}>
              <Text style={styles.stampText}>
                {"⌖ "}
                {stampText}
                {"  "}
                <Text style={styles.stampCheck}>✓</Text>
              </Text>
            </View>
          </View>

          {/* QR code + scan prompt + wordmark */}
          <View style={styles.bottomRow}>
            <QRGrid url={shareUrl} />
            <View style={styles.bottomTextStack}>
              <Text
                style={[
                  styles.scanPrompt,
                  { fontFamily: uiFont(language) },
                ]}
              >
                {strings.shareScanPrompt}
              </Text>
              <Text style={styles.wordmark}>OHLO · DAILY DISPATCH</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    width: POSTER_W,
    height: POSTER_H,
    backgroundColor: colors.ink900,
    padding: BACKDROP_PAD,
  },
  slip: {
    flex: 1,
    backgroundColor: colors.paper0,
    borderRadius: radius.slip,
    borderBottomWidth: 4,
    borderBottomColor: colors.paperEdge, // fold edge — "it's paper"
    padding: SLIP_PAD,
    justifyContent: "space-between",
  },
  // 头等信笺 — persimmon seal-edge for paper track
  slipPaper: {
    borderLeftWidth: 4,
    borderLeftColor: colors.persimmon,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    // top-align so dispatch № sits at the top of the taller postmark circle
    alignItems: "flex-start",
  },
  dispatch: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    color: colors.persimmon,
    letterSpacing: 1,
  },
  sealRow: {
    flexDirection: "row",
    marginTop: spacing.xs,
  },
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
  topicText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.paraSoft,
  },
  heroText: {
    color: colors.paraInk,
    fontSize: 22,
    lineHeight: 33,
    marginTop: spacing.sm,
  },
  dashed: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderTopColor: colors.paperEdge,
    marginBottom: spacing.sm,
  },
  stampRow: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  stamp: {
    alignSelf: "flex-start",
    borderWidth: 1.5,
    borderColor: colors.postmark,
    borderRadius: radius.stamp,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    transform: [{ rotate: "-1.2deg" }],
  },
  stampText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.postmark,
    letterSpacing: 0.3,
  },
  stampCheck: { color: colors.mint },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  bottomTextStack: {
    flex: 1,
  },
  scanPrompt: {
    fontSize: 12,
    color: colors.paraInk,
    lineHeight: 18,
  },
  wordmark: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 2,
    color: colors.paraSoft,
    opacity: 0.7,
    marginTop: 4,
  },
});
