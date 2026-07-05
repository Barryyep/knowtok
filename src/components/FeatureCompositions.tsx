/**
 * FeatureCompositions — 4 alternating editorial spreads.
 *
 * locale prop: "zh" or "en". Each visitor sees ONE language.
 * - zh page: Songti SC headings + zh body copy
 * - en page: Fraunces headings (promoted from former italic sublines) + en body
 *
 * Artifacts (widget mockup, stamp chip) also localize their fact text.
 *
 * I   — Scarcity + inline widget mockup
 * II  — AI radar + radar phone frame          [artifact left / text right]
 * III — Why you'd care + today phone + zoom detail
 * IV  — Real sources + CSS source-stamp chip  [artifact left / text right]
 *
 * Mobile 375px: text-then-artifact stacked for every composition.
 */

"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import type { Locale } from "@/lib/marketing-copy";
import { COPY } from "@/lib/marketing-copy";

// Design-system tokens (DESIGN.md)
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
  postmark: "#1C5C63",
} as const;

// Typography helpers — derived at render time from locale
function headStyle(locale: Locale): CSSProperties {
  return locale === "zh"
    ? {
        fontFamily:
          '"Songti SC", "Noto Serif SC", "Source Han Serif SC", serif',
        fontSize: "clamp(20px, 2.8vw, 28px)",
        fontWeight: 600,
        lineHeight: 1.4,
        color: C.inkText,
        marginBottom: 18,
        maxWidth: "28em",
      }
    : {
        fontFamily: 'var(--font-fraunces), "Georgia", serif',
        fontSize: "clamp(20px, 2.8vw, 28px)",
        fontWeight: 600,
        lineHeight: 1.35,
        color: C.inkText,
        marginBottom: 18,
        maxWidth: "28em",
        fontStyle: "normal",
      };
}

function bodyStyle(locale: Locale): CSSProperties {
  return locale === "zh"
    ? {
        fontFamily:
          '"Songti SC", "Noto Serif SC", "Source Han Serif SC", serif',
        fontSize: 13,
        lineHeight: 1.75,
        color: C.inkMuted,
        maxWidth: "62ch",
      }
    : {
        fontFamily: 'var(--font-fraunces), "Georgia", serif',
        fontSize: 13,
        lineHeight: 1.65,
        color: C.inkMuted,
        maxWidth: "62ch",
      };
}

const sNumeral: CSSProperties = {
  fontFamily: "var(--font-space-mono), 'Courier New', monospace",
  fontSize: "clamp(56px, 7vw, 88px)",
  fontWeight: 700,
  lineHeight: 1,
  letterSpacing: "-0.02em",
  color: C.inkMuted,
  opacity: 0.45,
  display: "block",
  marginBottom: 24,
};

// ─── Inline widget mockup (Composition I artifact) ────────────────────────────
function InlineWidget({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  const factFont =
    locale === "zh"
      ? '"Songti SC", "Noto Serif SC", "Source Han Serif SC", serif'
      : 'var(--font-fraunces), "Georgia", serif';

  return (
    <div
      style={{
        display: "inline-block",
        transform: "rotate(2.8deg)",
        transformOrigin: "center center",
        filter:
          "drop-shadow(0 18px 52px rgba(20,17,13,0.75)) drop-shadow(0 4px 12px rgba(20,17,13,0.4))",
      }}
    >
      {/* Wallpaper frame */}
      <div
        style={{
          position: "relative",
          width: 184,
          height: 184,
          borderRadius: 26,
          overflow: "hidden",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        {/* Blurred gradient wallpaper */}
        <div
          style={{
            position: "absolute",
            inset: -16,
            background:
              "linear-gradient(135deg, #3a2e1a 0%, #24201a 60%, #1a1712 100%)",
            filter: "blur(12px)",
          }}
        />
        {/* Dim overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(20,17,13,0.18)",
          }}
        />
        {/* Slip */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 152,
            background: C.paper0,
            borderRadius: 14,
            padding: "10px 12px 0 12px",
            borderBottom: `3px solid ${C.paperEdge}`,
            boxShadow: "0 4px 20px rgba(20,17,13,0.42)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span
              style={{
                fontFamily:
                  "var(--font-space-mono), 'Courier New', monospace",
                fontSize: 10,
                color: C.persimmon,
                letterSpacing: "0.05em",
              }}
            >
              № 0423
            </span>
            <span
              style={{
                fontFamily:
                  "var(--font-space-mono), 'Courier New', monospace",
                fontSize: 9,
                color: C.paraSoft,
                letterSpacing: "0.08em",
              }}
            >
              SAT · JUL 5
            </span>
          </div>

          <p
            style={{
              fontFamily: factFont,
              fontSize: 11,
              lineHeight: 1.5,
              color: C.paraInk,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            {copy.widgetFact}
          </p>

          <p
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 9,
              color: C.postmark,
              letterSpacing: "0.03em",
              paddingBottom: 10,
              transform: "rotate(-1.2deg)",
              transformOrigin: "left center",
              display: "inline-block",
            }}
          >
            ⌖ {copy.widgetSource} ✓
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Phone frame artifact (Compositions II + III) ─────────────────────────────
function PhoneArtifact({
  src,
  alt,
  rotate,
}: {
  src: string;
  alt: string;
  rotate: number;
}) {
  return (
    <div
      style={{
        display: "inline-block",
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "center bottom",
        filter:
          "drop-shadow(0 24px 64px rgba(20,17,13,0.75)) drop-shadow(0 6px 16px rgba(20,17,13,0.38))",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 192,
          height: 414,
          borderRadius: 40,
          background: C.ink800,
          border: `2px solid ${C.inkLine}`,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
          overflow: "hidden",
        }}
      >
        {/* Dynamic island */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            width: 76,
            height: 24,
            borderRadius: 12,
            background: C.ink900,
            zIndex: 2,
          }}
        />
        <Image
          src={src}
          alt={alt}
          fill
          style={{ objectFit: "cover", objectPosition: "top" }}
          sizes="192px"
        />
      </div>
    </div>
  );
}

// ─── Zoom crop detail (Composition III bonus) ─────────────────────────────────
function ZoomDetail({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  return (
    <div
      style={{
        position: "relative",
        width: 196,
        height: 68,
        borderRadius: 10,
        overflow: "hidden",
        border: `1px solid ${C.inkLine}`,
        boxShadow: "0 8px 24px rgba(20,17,13,0.55)",
        transform: "rotate(1.2deg)",
        flexShrink: 0,
      }}
    >
      <Image
        src="/screens/app-today.png"
        alt="Why you'd care region detail"
        fill
        style={{
          objectFit: "cover",
          objectPosition: "center 72%",
        }}
        sizes="196px"
      />
      {/* Label strip */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "3px 8px",
          background: "rgba(20,17,13,0.74)",
          backdropFilter: "blur(4px)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-space-mono), 'Courier New', monospace",
            fontSize: 7.5,
            color: C.inkMuted,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {copy.zoomLabel}
        </span>
      </div>
    </div>
  );
}

// ─── Source stamp chip (Composition IV artifact) ───────────────────────────────
function SourceStamp() {
  return (
    <div
      style={{
        display: "inline-block",
        transform: "rotate(-2.2deg)",
        filter:
          "drop-shadow(0 16px 44px rgba(20,17,13,0.68)) drop-shadow(0 4px 10px rgba(20,17,13,0.35))",
      }}
    >
      <div
        style={{
          background: C.paper0,
          borderRadius: 6,
          padding: "18px 22px 14px",
          borderBottom: `3px solid ${C.paperEdge}`,
          minWidth: 228,
          maxWidth: 260,
        }}
      >
        {/* Primary stamp */}
        <span
          style={{
            fontFamily: "var(--font-space-mono), 'Courier New', monospace",
            fontSize: 12,
            fontWeight: 700,
            color: C.postmark,
            letterSpacing: "0.04em",
            display: "block",
            transform: "rotate(-1.2deg)",
            transformOrigin: "left center",
            marginBottom: 12,
          }}
        >
          ⌖ Nature · 2025-03-26 ✓
        </span>

        {/* Dashed divider */}
        <div
          style={{
            borderTop: `1px dashed ${C.paraSoft}`,
            opacity: 0.45,
            marginBottom: 12,
          }}
        />

        {/* Secondary stamps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          <span
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 10,
              color: C.paraSoft,
              letterSpacing: "0.05em",
              display: "block",
              transform: "rotate(-0.7deg)",
              transformOrigin: "left center",
            }}
          >
            ⌖ arXiv · 2025-06-12 ✓
          </span>
          <span
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 10,
              color: C.paraSoft,
              letterSpacing: "0.05em",
              display: "block",
              transform: "rotate(-1.6deg)",
              transformOrigin: "left center",
            }}
          >
            ⌖ Wikipedia · 2025-05-04 ✓
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Shared entrance animation wrapper ────────────────────────────────────────
function ArtifactReveal({
  children,
  delay = 0.15,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="feat-artifact"
      initial={reduce ? false : { y: 20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Composition I: Scarcity + widget ─────────────────────────────────────────
function CompositionI({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  return (
    <section className="feat-section feat-section--first">
      <div className="feat-rule" />
      <div className="feat-grid feat-grid--normal">
        <div className="feat-text-col">
          <span style={sNumeral}>I</span>
          <p style={headStyle(locale)}>{copy.comp1Head}</p>
          <p style={bodyStyle(locale)}>{copy.comp1Body}</p>
        </div>
        <ArtifactReveal>
          <InlineWidget locale={locale} />
        </ArtifactReveal>
      </div>
    </section>
  );
}

// ─── Composition II: Radar + phone ────────────────────────────────────────────
function CompositionII({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  return (
    <section className="feat-section">
      <div className="feat-rule" />
      <div className="feat-grid feat-grid--reverse">
        <ArtifactReveal>
          <PhoneArtifact
            src="/screens/app-radar.png"
            alt="Ohlo curiosity radar screen"
            rotate={3}
          />
        </ArtifactReveal>
        <div className="feat-text-col">
          <span style={sNumeral}>II</span>
          <p style={headStyle(locale)}>{copy.comp2Head}</p>
          <p style={bodyStyle(locale)}>{copy.comp2Body}</p>
        </div>
      </div>
    </section>
  );
}

// ─── Composition III: Why care + today phone + zoom ───────────────────────────
function CompositionIII({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  return (
    <section className="feat-section">
      <div className="feat-rule" />
      <div className="feat-grid feat-grid--normal">
        <div className="feat-text-col">
          <span style={sNumeral}>III</span>
          <p style={headStyle(locale)}>{copy.comp3Head}</p>
          <p style={bodyStyle(locale)}>{copy.comp3Body}</p>
        </div>
        <ArtifactReveal>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 20,
            }}
          >
            <PhoneArtifact
              src="/screens/app-today.png"
              alt="Ohlo today screen with dispatch card"
              rotate={-4}
            />
            <ZoomDetail locale={locale} />
          </div>
        </ArtifactReveal>
      </div>
    </section>
  );
}

// ─── Composition IV: Sources + stamp ──────────────────────────────────────────
function CompositionIV({ locale }: { locale: Locale }) {
  const copy = COPY[locale];
  return (
    <section className="feat-section">
      <div className="feat-rule" />
      <div className="feat-grid feat-grid--reverse">
        <ArtifactReveal>
          <SourceStamp />
        </ArtifactReveal>
        <div className="feat-text-col">
          <span style={sNumeral}>IV</span>
          <p style={headStyle(locale)}>{copy.comp4Head}</p>
          <p style={bodyStyle(locale)}>{copy.comp4Body}</p>
        </div>
      </div>
    </section>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export function FeatureCompositions({ locale }: { locale: Locale }) {
  return (
    <>
      <style>{`
        .feat-section {
          padding-bottom: clamp(56px, 7vw, 96px);
          position: relative;
        }
        .feat-section--first {
          margin-top: 48px;
          padding-top: 0;
        }
        .feat-rule {
          height: 1px;
          background: #2A251C;
          width: 100%;
          margin-bottom: 0;
        }
        .feat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(24px, 4vw, 72px);
          align-items: start;
          padding-top: clamp(24px, 3vw, 40px);
        }
        .feat-text-col {
          /* natural flow */
        }
        .feat-artifact {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 4px;
          margin-top: -28px;
          position: relative;
          z-index: 2;
        }
        /* Reverse layout: artifact left, text right */
        .feat-grid--reverse .feat-text-col { order: 2; }
        .feat-grid--reverse .feat-artifact { order: 1; }

        @media (max-width: 767px) {
          .feat-grid,
          .feat-grid--reverse {
            grid-template-columns: 1fr;
            gap: clamp(32px, 6vw, 48px);
          }
          /* Always text first on mobile */
          .feat-grid--reverse .feat-text-col { order: 1; }
          .feat-grid--reverse .feat-artifact { order: 2; }
          .feat-artifact {
            margin-top: 0;
            justify-content: flex-start;
          }
        }
      `}</style>
      <CompositionI locale={locale} />
      <CompositionII locale={locale} />
      <CompositionIII locale={locale} />
      <CompositionIV locale={locale} />
    </>
  );
}
