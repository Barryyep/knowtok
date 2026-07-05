/**
 * MarketingPage — shared homepage component for /zh and /en.
 *
 * Takes a locale prop; all copy comes from marketing-copy.ts.
 * Rendered as a server component; DispatchStack and FeatureCompositions
 * are client islands that receive locale at mount.
 *
 * Typography per locale:
 *   zh — Songti SC (system, no load) for headlines; Space Mono for stamps
 *   en — Fraunces (loaded) for headlines; Space Mono for stamps
 *
 * Both locales load both font variables so the toggle link and any
 * cross-locale UI elements render correctly.
 */

import { Fraunces, Space_Mono } from "next/font/google";
import { DispatchStack } from "@/components/DispatchStack";
import { FeatureCompositions } from "@/components/FeatureCompositions";
import { LangToggle } from "@/components/LangToggle";
import { COPY, type Locale } from "@/lib/marketing-copy";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
  display: "swap",
});

// Design-system tokens from DESIGN.md
const C = {
  ink900: "#14110D",
  inkLine: "#2A251C",
  inkText: "#EDE3D0",
  inkMuted: "#9A8D74",
  persimmon: "#EC4A24",
} as const;

export function MarketingPage({ locale }: { locale: Locale }) {
  const copy = COPY[locale];

  // Hero headline font: zh = Songti SC (system serif), en = Fraunces
  const heroHeadFont =
    locale === "zh"
      ? '"Songti SC", "Noto Serif SC", "Source Han Serif SC", serif'
      : 'var(--font-fraunces), "Georgia", serif';

  return (
    <div
      className={`${fraunces.variable} ${spaceMono.variable}`}
      style={{
        minHeight: "100dvh",
        background: C.ink900,
        color: C.inkText,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        .cta-pill:active {
          transform: translateY(1px) scale(0.98);
        }
      `}</style>

      {/* ─── Header strip ─────────────────────────────────────────────── */}
      <header
        style={{
          padding: "20px clamp(24px, 5vw, 96px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-space-mono), 'Courier New', monospace",
            fontSize: 10,
            letterSpacing: "0.22em",
            color: C.inkMuted,
            textTransform: "uppercase",
          }}
        >
          {copy.headerWordmark}
        </span>

        {/* Right side: locale label + toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 10,
              letterSpacing: "0.14em",
              color: C.inkMuted,
              textTransform: "uppercase",
            }}
          >
            {copy.headerRight}
          </span>
          <LangToggle locale={locale} />
        </div>
      </header>

      {/* ─── Main content ─────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          width: "100%",
          padding: "0 clamp(24px, 5vw, 96px)",
          boxSizing: "border-box",
        }}
      >
        {/* ── Hero copy ──────────────────────────────────────────────── */}
        <section style={{ paddingTop: 48, paddingBottom: 0 }}>
          {/* Primary headline */}
          <p
            style={{
              fontFamily: heroHeadFont,
              fontSize: "clamp(26px, 6vw, 42px)",
              fontWeight: 600,
              lineHeight: 1.4,
              color: C.inkText,
              marginBottom: 14,
              maxWidth: "16em",
            }}
          >
            {copy.heroHeadline}
          </p>

          {/* Delivery note */}
          <p
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 11,
              lineHeight: 1.65,
              color: C.inkMuted,
              letterSpacing: "0.03em",
              marginTop: 0,
              maxWidth: "38em",
            }}
          >
            {copy.heroDelivery}
          </p>
        </section>

        {/* ── Dispatch stack — client island ─────────────────────────── */}
        <div style={{ overflowX: "clip", overflowY: "visible" }}>
          <DispatchStack locale={locale} />
        </div>

        {/* ─── Feature compositions (I–IV) ───────────────────────────── */}
        <FeatureCompositions locale={locale} />

        {/* ─── CTA ──────────────────────────────────────────────────────── */}
        <section
          style={{
            paddingBottom: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <a
            href="#"
            data-todo="appstore-link"
            className="cta-pill"
            style={{
              display: "inline-block",
              background: C.persimmon,
              color: "#FFFFFF",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "0.02em",
              padding: "13px 36px",
              borderRadius: 9999,
              textDecoration: "none",
              transition: "transform 80ms ease, opacity 120ms ease",
            }}
          >
            {copy.ctaButton}
          </a>
          <p
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 10,
              color: C.inkMuted,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {copy.ctaComingSoon}
          </p>
        </section>
      </main>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer
        style={{
          width: "100%",
          padding: "20px clamp(24px, 5vw, 96px)",
          borderTop: `1px solid ${C.inkLine}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-space-mono), 'Courier New', monospace",
            fontSize: 10,
            letterSpacing: "0.2em",
            color: C.inkMuted,
            textTransform: "uppercase",
          }}
        >
          {copy.footerLeft}
        </span>
        <span
          style={{
            fontFamily: "var(--font-space-mono), 'Courier New', monospace",
            fontSize: 10,
            letterSpacing: "0.12em",
            color: C.inkMuted,
          }}
        >
          {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  );
}
