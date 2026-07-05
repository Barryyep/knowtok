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
 *
 * Responsive sizing: phone frames and widget scale with viewport width.
 * Base sizes are calibrated for 1280px; scale is clamped to 0.82–1.55.
 */

"use client";

import { useState, useEffect } from "react";
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

// Base phone frame dimensions (CSS units) — calibrated for 1280px viewport
const PHONE_W_BASE = 186;
const PHONE_H_BASE = 400;
const BEZEL_RADIUS_BASE = 40;
const NOTCH_W_BASE = 76;
const NOTCH_H_BASE = 22;

/** Phone/widget scale factor: 1.0 at 1280px, clamped 0.82–1.55. */
function usePhoneScale(): number {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    function update() {
      setScale(Math.max(0.82, Math.min(1.55, window.innerWidth / 1280)));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return scale;
}

interface PhoneFrameProps {
  src: string;
  alt: string;
  rotate: number;
  delay: number;
  w: number;
  h: number;
  bezelR: number;
  notchW: number;
  notchH: number;
}

function PhoneFrame({ src, alt, rotate, delay, w, h, bezelR, notchW, notchH }: PhoneFrameProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { y: 24 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "relative",
        width: w,
        flexShrink: 0,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "center bottom",
      }}
    >
      {/* Outer bezel */}
      <div
        style={{
          width: w,
          height: h,
          borderRadius: bezelR,
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
            width: notchW,
            height: notchH,
            borderRadius: notchH / 2,
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
          sizes={`${w}px`}
          priority={delay < 0.2}
        />
      </div>
    </motion.div>
  );
}

// CSS home-screen widget mockup
function WidgetMockup({ scale }: { scale: number }) {
  const wallSize = Math.round(172 * scale);
  const cardW = Math.round(142 * scale);
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
          width: wallSize,
          height: wallSize,
          borderRadius: Math.round(24 * scale),
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
            width: cardW,
            background: C.paper0,
            borderRadius: Math.round(16 * scale),
            padding: `${Math.round(10 * scale)}px ${Math.round(12 * scale)}px 0 ${Math.round(12 * scale)}px`,
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
                fontSize: Math.round(10 * scale),
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
                fontSize: Math.round(9 * scale),
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
              fontSize: Math.round(11 * scale),
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
              fontSize: Math.round(9 * scale),
              color: C.postmark,
              letterSpacing: "0.03em",
              paddingBottom: Math.round(10 * scale),
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
  const s = usePhoneScale();
  const w = Math.round(PHONE_W_BASE * s);
  const h = Math.round(PHONE_H_BASE * s);
  const br = Math.round(BEZEL_RADIUS_BASE * s);
  const nw = Math.round(NOTCH_W_BASE * s);
  const nh = Math.round(NOTCH_H_BASE * s);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "clamp(24px, 3vw, 64px)",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <PhoneFrame
        src="/screens/app-today.png"
        alt="Ohlo today screen: dispatch card with why you'd care"
        rotate={-5}
        delay={0}
        w={w}
        h={h}
        bezelR={br}
        notchW={nw}
        notchH={nh}
      />
      <PhoneFrame
        src="/screens/app-radar.png"
        alt="Ohlo curiosity radar: your interest profile"
        rotate={3}
        delay={0.08}
        w={w}
        h={h}
        bezelR={br}
        notchW={nw}
        notchH={nh}
      />
      <WidgetMockup scale={s} />
    </div>
  );
}
