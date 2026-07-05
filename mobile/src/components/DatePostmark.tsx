import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "../theme";

interface Props {
  /** Fact date, YYYY-MM-DD — the visual anchor of the cancellation mark. */
  date: string;
  /** Outer diameter in logical pts. Default 68. */
  size?: number;
}

/**
 * Circular dated cancellation mark stamped over the paper slip.
 * Thin postmark-teal ring (1.5pt), three stacked Space Mono lines:
 *   OHLO  /  2026·07·04  /  DAILY
 * Tilt -8°, opacity 0.85 — ink-on-paper feel.
 * Transparent fill so slip content shows through.
 */
export function DatePostmark({ date, size = 68 }: Props) {
  const dateLabel = date.replace(/-/g, "·");
  const s = size / 68;

  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          { fontSize: Math.round(7 * s), letterSpacing: 2 * s },
        ]}
      >
        OHLO
      </Text>
      <Text
        style={[
          styles.text,
          { fontSize: Math.round(8.5 * s), letterSpacing: 0.5 },
        ]}
      >
        {dateLabel}
      </Text>
      <Text
        style={[
          styles.text,
          { fontSize: Math.round(7 * s), letterSpacing: 2 * s },
        ]}
      >
        DAILY
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 1.5,
    borderColor: colors.postmark,
    opacity: 0.85,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "-8deg" }],
    gap: 2,
  },
  text: {
    fontFamily: fonts.mono,
    color: colors.postmark,
    textAlign: "center",
  },
});
