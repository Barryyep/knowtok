import type { AppLanguage } from "./lib/types";

// ── The Daily Dispatch palette ──────────────────────────────────────────
// Warm ink + riso duotone. NO navy / cool blue / purple / gradients.

// The desk (dark ground)
const ink900 = "#14110D"; // app bg
const ink800 = "#1E1A14"; // nav / tab / elevated
const inkLine = "#2A251C"; // hairlines
const inkText = "#EDE3D0"; // text on dark
const inkMuted = "#9A8D74"; // meta on dark

// The paper (hero slip)
const paper0 = "#F3E9D6"; // card surface
const paperEdge = "#E4D6BC"; // bottom fold (4px border trick)
const paraInk = "#241E15"; // fact text
const paraSoft = "#6B5E48"; // secondary on paper

// Accents (ink stamps — sparing, high impact)
const persimmon = "#EC4A24"; // dispatch №, primary button, share, premium seal
const marigold = "#F2A63B"; // ritual: date eyebrow, streak dots, "today arrived"
const postmark = "#1C5C63"; // source stamp (stamp of approval)
const mint = "#7FD1B0"; // verified ✓ only

export const colors = {
  // desk
  ink900,
  ink800,
  inkLine,
  inkText,
  inkMuted,
  // paper
  paper0,
  paperEdge,
  paraInk,
  paraSoft,
  // accents
  persimmon,
  marigold,
  postmark,
  mint,
  // semantic aliases (dark chrome)
  bg: ink900,
  elevated: ink800,
  line: inkLine,
  text: inkText,
  textDim: inkMuted,
  danger: persimmon,
  success: mint,
} as const;

// Base unit 4px. xs4 sm8 md16 lg24 xl32 2xl48
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  slip: 18,
  widget: 22,
  pill: 999,
  stamp: 4,
} as const;

// ── Fonts ───────────────────────────────────────────────────────────────
// Keys must match the useFonts() registration in App.tsx.
export const fonts = {
  heroEn: "Fraunces_600SemiBold", // EN hero fact — editorial pull-quote
  heroZh: "LXGWWenKai-Medium", // ZH hero fact — 霞鹜文楷
  heroZhSoft: "LXGWWenKai-Regular", // ZH paper body / why-care
  ui: "InstrumentSans_400Regular",
  uiMedium: "InstrumentSans_500Medium",
  uiSemibold: "InstrumentSans_600SemiBold",
  uiBold: "InstrumentSans_700Bold",
  mono: "SpaceMono_400Regular", // receipt / postmark texture
  monoBold: "SpaceMono_700Bold", // dispatch №
} as const;

/** Hero fact font, switched on content language. */
export function heroFont(language: AppLanguage): string {
  return language === "zh" ? fonts.heroZh : fonts.heroEn;
}

/**
 * Soft body font on the cream slip (why-care, labels). ZH keeps the warm
 * 霞鹜文楷 serif; EN uses Instrument Sans. NEVER PingFang for paper text.
 */
export function paperBodyFont(language: AppLanguage): string {
  return language === "zh" ? fonts.heroZhSoft : fonts.ui;
}

type UiWeight = "regular" | "medium" | "semibold" | "bold";

/**
 * UI-label font for dark chrome. ZH returns undefined so the system
 * PingFang / Noto Sans renders Chinese glyphs (Instrument Sans is Latin-only
 * and would tofu). EN gets Instrument Sans at the requested weight.
 */
export function uiFont(language: AppLanguage, weight: UiWeight = "regular"): string | undefined {
  if (language === "zh") return undefined;
  switch (weight) {
    case "bold":
      return fonts.uiBold;
    case "semibold":
      return fonts.uiSemibold;
    case "medium":
      return fonts.uiMedium;
    default:
      return fonts.ui;
  }
}
