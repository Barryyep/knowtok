/**
 * Ohlo marketing homepage — V3.
 *
 * Design Read: consumer app landing for design-conscious zh-first curious
 * public, letterpress/postal editorial language, leaning toward native CSS +
 * Fraunces (brand-mandated override per DESIGN.md) + Space Mono + warm-ink
 * dark-first palette.
 *
 * Dials: DESIGN_VARIANCE 7 / MOTION_INTENSITY 6 / VISUAL_DENSITY 3.
 *
 * V3 additions over V2:
 *   - DispatchStack: hero slip becomes 6-card fanned stack (client component)
 *   - AppShowcase: phone frames + CSS widget mockup (client component)
 *   - Ledger expanded to 5 entries: scarcity + AI persona + why-care + widget + sources
 *
 * Bug fixed: opacity-gate on .slip-arrive.
 *   Old: animation fill-mode "both" + delay → opacity:0 in headless/reduced-motion.
 *   Fix: removed. DispatchStack now owns all slip-level animation via framer-motion
 *   with initial={false} on each card (opacity always 1 at rest) + container entrance
 *   guarded by useReducedMotion. CSS .slip-arrive class removed entirely.
 */

import { Fraunces, Space_Mono } from "next/font/google";
import type { Metadata } from "next";
import { DispatchStack } from "@/components/DispatchStack";
import { FeatureCompositions } from "@/components/FeatureCompositions";

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
  ink800: "#1E1A14",
  inkLine: "#2A251C",
  inkText: "#EDE3D0",
  inkMuted: "#9A8D74",
  paper0: "#F3E9D6",
  paperEdge: "#E4D6BC",
  paraInk: "#241E15",
  paraSoft: "#6B5E48",
  persimmon: "#EC4A24",
  marigold: "#F2A63B",
  postmark: "#1C5C63",
} as const;

export const metadata: Metadata = {
  title: "Ohlo - 每日信笺 Daily Dispatch",
  description:
    "Delivered to your lock screen and home screen, from real papers and data, stamped with its source.",
};


export default function HomePage() {
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
        /* Tactile CTA press */
        .cta-pill:active {
          transform: translateY(1px) scale(0.98);
        }

        /* Touch / no-hover devices: static fanned stack via CSS only.
           The DispatchStack JS hover state is never triggered on touch,
           so cards naturally stay at their framer-motion resting positions.
           No additional CSS needed. The gentle fan is the resting state. */
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
          OHLO
        </span>
        <span
          style={{
            fontFamily: "var(--font-space-mono), 'Courier New', monospace",
            fontSize: 10,
            letterSpacing: "0.14em",
            color: C.inkMuted,
            textTransform: "uppercase",
          }}
        >
          每日信笺
        </span>
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
        <section
          style={{
            paddingTop: 48,
            paddingBottom: 0,
          }}
        >
          {/* Primary zh headline */}
          <p
            style={{
              fontFamily:
                '"Songti SC", "Noto Serif SC", "Source Han Serif SC", serif',
              fontSize: "clamp(26px, 6vw, 42px)",
              fontWeight: 600,
              lineHeight: 1.4,
              color: C.inkText,
              marginBottom: 10,
              maxWidth: "16em",
            }}
          >
            每天一条，值得停下来的知识。
          </p>

          {/* EN translation — Fraunces, subordinate scale */}
          <p
            style={{
              fontFamily: 'var(--font-fraunces), "Georgia", serif',
              fontSize: "clamp(15px, 3vw, 20px)",
              fontWeight: 400,
              lineHeight: 1.55,
              color: C.inkMuted,
              marginBottom: 4,
              maxWidth: "30em",
            }}
          >
            One thing worth stopping for, every day.
          </p>

          {/* Delivery subtext */}
          <p
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 11,
              lineHeight: 1.65,
              color: C.inkMuted,
              letterSpacing: "0.03em",
              marginTop: 14,
              maxWidth: "38em",
            }}
          >
            印在你的锁屏和桌面上，来自真实的论文与数据，盖着出处的邮戳。
            <br />
            Delivered to your lock screen and home screen, from real papers
            and data, stamped with its source.
          </p>
        </section>

        {/* ── Dispatch stack — client island ─────────────────────────── */}
        {/*
          DispatchStack replaces V2's single slip. Six real dispatch cards
          fanned like a pile of mail. Hover fans them out; touch shows the
          static gentle fan (framer-motion resting state = no hover interaction).
          Opacity fix lives here: initial={false} on each card + container
          entrance guarded by useReducedMotion. Opacity 1 at rest, always.
        */}
        {/* overflow-x: clip prevents scattered cards from triggering a horizontal
            scrollbar while keeping overflow-y visible for the lift animation. */}
        <div style={{ overflowX: "clip", overflowY: "visible" }}>
          <DispatchStack />
        </div>

        {/* ─── Feature compositions (I–IV) ───────────────────────────── */}
        <FeatureCompositions />

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
            获取 Ohlo / Get Ohlo
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
            App Store · 即将上线 / coming soon
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
          OHLO · DAILY DISPATCH
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
