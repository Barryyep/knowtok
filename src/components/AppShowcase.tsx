/**
 * AppShowcase — App screenshots in CSS phone frames + CSS widget mockup.
 *
 * Two phone frames (ink bezel, rounded rect, subtle shadow):
 *   - app-today.png: the Today screen with a dispatch card, tilted -5deg
 *   - app-radar.png: the curiosity radar, tilted +3deg
 *
 * CSS home-screen widget mockup:
 *   A cream dispatch slip sitting on a blurred-gradient "wallpaper" background,
 *   illustrating the widget-first story without needing a real widget screenshot.
 *
 * Motion: entrance slide-up per item, reduced-motion respects useReducedMotion.
 */

"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

const C = {
  ink900: "#14110D",
  ink800: "#1E1A14",
  inkLine: "#2A251C",
  inkMuted: "#9A8D74",
  paper0: "#F3E9D6",
  paperEdge: "#E4D6BC",
  paraInk: "#241E15",
  paraSoft: "#6B5E48",
  persimmon: "#EC4A24",
  postmark: "#1C5C63",
} as const;

// Phone frame dimensions (CSS units, display size not device px)
const PHONE_W = 186;
const PHONE_H = 400;
const BEZEL_RADIUS = 40;
const NOTCH_W = 76;
const NOTCH_H = 22;

interface PhoneFrameProps {
  src: string;
  alt: string;
  rotate: number;
  delay: number;
}

function PhoneFrame({ src, alt, rotate, delay }: PhoneFrameProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { y: 24 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "relative",
        width: PHONE_W,
        flexShrink: 0,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "center bottom",
      }}
    >
      {/* Outer bezel */}
      <div
        style={{
          width: PHONE_W,
          height: PHONE_H,
          borderRadius: BEZEL_RADIUS,
          background: C.ink800,
          border: `2px solid ${C.inkLine}`,
          boxShadow:
            "0 24px 72px rgba(20,17,13,0.72), inset 0 0 0 1px rgba(255,255,255,0.04)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Dynamic island notch */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            width: NOTCH_W,
            height: NOTCH_H,
            borderRadius: NOTCH_H / 2,
            background: C.ink900,
            zIndex: 2,
          }}
        />

        {/* Screenshot */}
        <Image
          src={src}
          alt={alt}
          fill
          style={{ objectFit: "cover", objectPosition: "top" }}
          sizes={`${PHONE_W}px`}
          priority={delay < 0.2}
        />
      </div>
    </motion.div>
  );
}

// CSS home-screen widget mockup
function WidgetMockup() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { y: 20 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        flexShrink: 0,
      }}
    >
      {/* Wallpaper frame */}
      <div
        style={{
          position: "relative",
          width: 172,
          height: 172,
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(20,17,13,0.55)",
        }}
      >
        {/* Blurred gradient wallpaper — extends past edges to hide blur artifacts */}
        <div
          style={{
            position: "absolute",
            inset: -16,
            background:
              "linear-gradient(135deg, #3a5f8a 0%, #6b3fa0 45%, #1e6b5a 100%)",
            filter: "blur(14px)",
          }}
        />

        {/* Dim overlay for depth */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(20,17,13,0.18)",
          }}
        />

        {/* Widget card — the cream slip */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 142,
            background: C.paper0,
            borderRadius: 16,
            padding: "10px 12px 0 12px",
            borderBottom: `3px solid ${C.paperEdge}`,
            boxShadow: "0 4px 20px rgba(20,17,13,0.42)",
          }}
        >
          {/* № + date row */}
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
              SAT · JUL 4
            </span>
          </div>

          {/* Short fact */}
          <p
            style={{
              fontFamily:
                '"Songti SC", "Noto Serif SC", "Source Han Serif SC", serif',
              fontSize: 11,
              lineHeight: 1.5,
              color: C.paraInk,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            大脑仅占体重的2%，却消耗全身约20%的能量。
          </p>

          {/* Source line */}
          <p
            style={{
              fontFamily:
                "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 9,
              color: C.postmark,
              letterSpacing: "0.03em",
              paddingBottom: 10,
              transform: "rotate(-1.2deg)",
              transformOrigin: "left center",
              display: "inline-block",
            }}
          >
            ⌖ 综合知识 ✓
          </p>
        </div>
      </div>

      {/* Label */}
      <p
        style={{
          fontFamily: "var(--font-space-mono), 'Courier New', monospace",
          fontSize: 9,
          letterSpacing: "0.16em",
          color: C.inkMuted,
          textTransform: "uppercase",
          textAlign: "center",
        }}
      >
        Widget preview
      </p>
    </motion.div>
  );
}

export function AppShowcase() {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 24,
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <PhoneFrame
        src="/screens/app-today.png"
        alt="Ohlo today screen: dispatch card with why you'd care"
        rotate={-5}
        delay={0}
      />
      <PhoneFrame
        src="/screens/app-radar.png"
        alt="Ohlo curiosity radar: your interest profile"
        rotate={3}
        delay={0.08}
      />
      <WidgetMockup />
    </div>
  );
}
