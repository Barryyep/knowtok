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
import { AppShowcase } from "@/components/AppShowcase";

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

type LedgerEntry = {
  num: string;
  zh: string;
  en: string;
  bodyZh: string;
  bodyEn: string;
};

const LEDGER_ENTRIES: LedgerEntry[] = [
  {
    num: "I",
    zh: "每天只有一条",
    en: "One a day",
    bodyZh: "不是无限的流，是一封信。每天一条，值得停下来的那一条。",
    bodyEn:
      "Not a feed - a letter. One dispatch per day, chosen to be the one you'd stop for.",
  },
  {
    num: "II",
    zh: "好奇雷达算出你最感兴趣的",
    en: "The radar picks the one you'd stop for",
    bodyZh: "好奇雷达从你的测验人设出发，找出当天最可能让你发呆三秒钟的那条。不是算法猜，是你告诉它的。",
    bodyEn:
      "A quiz-derived persona tells the system what kind of curiosity you carry. No black box: it follows your lead.",
  },
  {
    num: "III",
    zh: "为什么这条跟你有关",
    en: "Why you'd care",
    bodyZh: "每条信笺都附带一句「为什么这条跟你有关」。不是背景介绍，是直接告诉你：这件事和你的生活有什么关系。",
    bodyEn:
      "Every dispatch includes a why-you'd-care line. Not a summary: a direct connection to your life.",
  },
  {
    num: "IV",
    zh: "组件上门",
    en: "Widget on-screen",
    bodyZh: "不用打开 app，信就在锁屏上。抬眼的那一刻就到了。",
    bodyEn:
      "The dispatch lands on your lock screen and home screen. No tap required.",
  },
  {
    num: "V",
    zh: "真实来源",
    en: "Real sources",
    bodyZh: "每条都盖出处邮戳。论文轨是当天的真论文。",
    bodyEn:
      "Every dispatch carries a source stamp. The paper trail is the day's real paper.",
  },
];

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

        /* Ledger entry hover: left-edge rule turns persimmon */
        .ledger-entry:hover .ledger-rule {
          background: #EC4A24;
          opacity: 1;
        }

        /* Touch / no-hover devices: static fanned stack via CSS only.
           The DispatchStack JS hover state is never triggered on touch,
           so cards naturally stay at their framer-motion resting positions.
           No additional CSS needed. The gentle fan is the resting state. */
      `}</style>

      {/* ─── Header strip ─────────────────────────────────────────────── */}
      <header
        style={{
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 840,
          width: "100%",
          margin: "0 auto",
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
          maxWidth: 840,
          margin: "0 auto",
          padding: "0 24px",
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
        <DispatchStack />

        {/* ─── Scarcity + Ledger ──────────────────────────────────────── */}
        {/*
          Scarcity statement leads the section (requirement III).
          Then 5 numbered entries cover: scarcity, AI persona, why-care,
          widget, sources — as a numbered dispatch ledger, not a card row.
        */}
        <section
          style={{
            paddingTop: 64,
            paddingBottom: 64,
            borderTop: `1px solid ${C.inkLine}`,
            marginTop: 48,
          }}
        >
          {/* Scarcity statement — proud and plain */}
          <p
            style={{
              fontFamily:
                '"Songti SC", "Noto Serif SC", "Source Han Serif SC", serif',
              fontSize: "clamp(18px, 4vw, 26px)",
              fontWeight: 600,
              lineHeight: 1.45,
              color: C.inkText,
              maxWidth: "22em",
              marginBottom: 6,
            }}
          >
            每天只有一条。不是无限的流，是一封信。
          </p>
          <p
            style={{
              fontFamily: 'var(--font-fraunces), "Georgia", serif',
              fontSize: "clamp(14px, 2.5vw, 18px)",
              fontWeight: 400,
              lineHeight: 1.55,
              color: C.inkMuted,
              maxWidth: "32em",
              marginBottom: 40,
            }}
          >
            One a day. Not a feed - a letter.
          </p>

          {/* Ledger entries */}
          {LEDGER_ENTRIES.map((entry) => (
            <div
              key={entry.num}
              className="ledger-entry"
              style={{
                display: "grid",
                gridTemplateColumns: "36px 1fr",
                gap: "0 16px",
                paddingTop: 20,
                paddingBottom: 24,
                borderBottom: `1px solid ${C.inkLine}`,
                position: "relative",
              }}
            >
              {/* Left-edge rule */}
              <div
                className="ledger-rule"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: C.inkLine,
                  opacity: 0.6,
                  transition: "background 200ms ease, opacity 200ms ease",
                }}
              />

              {/* Dispatch number */}
              <div style={{ paddingLeft: 10, paddingTop: 2 }}>
                <span
                  style={{
                    fontFamily:
                      "var(--font-space-mono), 'Courier New', monospace",
                    fontSize: 11,
                    color: C.inkMuted,
                    letterSpacing: "0.08em",
                  }}
                >
                  {entry.num}
                </span>
              </div>

              {/* Entry content */}
              <div>
                <p
                  style={{
                    fontFamily: '"Songti SC", "Noto Serif SC", serif',
                    fontSize: 20,
                    fontWeight: 600,
                    lineHeight: 1.45,
                    color: C.inkText,
                    marginBottom: 4,
                  }}
                >
                  {entry.zh}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-fraunces), "Georgia", serif',
                    fontSize: 14,
                    fontWeight: 400,
                    lineHeight: 1.5,
                    color: C.inkMuted,
                    marginBottom: 8,
                    fontStyle: "italic",
                  }}
                >
                  {entry.en}
                </p>
                <p
                  style={{
                    fontFamily: '"Songti SC", "Noto Serif SC", serif',
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: C.inkMuted,
                    marginBottom: 3,
                  }}
                >
                  {entry.bodyZh}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-fraunces), "Georgia", serif',
                    fontSize: 13,
                    lineHeight: 1.65,
                    color: C.inkMuted,
                  }}
                >
                  {entry.bodyEn}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* ─── App showcase — client island ───────────────────────────── */}
        {/*
          Two phone frames (real screenshots) + CSS home-screen widget mockup.
          Phone frames use CSS only: ink bezel, rounded rect, dynamic island,
          subtle tinted shadow. Slight tilt on each phone for physicality.
          Widget mockup shows the widget-first story without a real screenshot.
        */}
        <section
          style={{
            paddingTop: 0,
            paddingBottom: 72,
          }}
        >
          {/* Section intro */}
          <p
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 10,
              letterSpacing: "0.2em",
              color: C.inkMuted,
              textTransform: "uppercase",
              marginBottom: 32,
            }}
          >
            THE APP
          </p>

          <AppShowcase />
        </section>

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
          maxWidth: 840,
          margin: "0 auto",
          padding: "20px 24px",
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
