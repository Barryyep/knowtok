/**
 * DispatchStack — V3 hero component.
 *
 * Six dispatch cards fanned like a pile of mail on a desk.
 * Desktop hover: stack scatters wide like letters tossed across a desk.
 * Touch / no-hover: static gentle fan — no JS interaction.
 *
 * Motion approach: framer-motion animate prop drives all transforms.
 * initial={false} on each card → cards snap to resting position on mount
 * with no opacity gate. Entrance is handled on the container only,
 * guarded by useReducedMotion → opacity is always 1 at rest.
 *
 * Responsive spread: spreadFactor derived from window.innerWidth via
 * resize observer. Full spread (1.0) at ≥1280px; scales down proportionally.
 */

"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Design tokens from DESIGN.md
const C = {
  paper0: "#F3E9D6",
  paperEdge: "#E4D6BC",
  paraInk: "#241E15",
  paraSoft: "#6B5E48",
  persimmon: "#EC4A24",
  marigold: "#F2A63B",
  postmark: "#1C5C63",
} as const;

interface DispatchCard {
  num: string;
  category: string;
  categoryColor: string;
  zh: string;
  en: string;
  source: string;
  /** Optional why-care teaser — shown on one card to preview the feature */
  whyCareZh?: string;
}

const CARDS: DispatchCard[] = [
  {
    num: "№ 0418",
    category: "GLOBAL HEALTH",
    categoryColor: C.marigold,
    zh: "在乍得，大约每25个女孩中就有1人会因为怀孕相关原因而去世。",
    en: "In Chad, roughly 1 in 25 girls will die from pregnancy-related causes in her lifetime.",
    source: "Our World in Data",
    whyCareZh: "为什么这条跟你有关：你在乎的人生活在一个系统性不平等里。",
  },
  {
    num: "№ 0419",
    category: "ASTRONOMY",
    categoryColor: C.postmark,
    zh: "月球每年远离地球3.8厘米，自1969年起由激光测距持续确认。",
    en: "The Moon drifts 3.8 cm farther from Earth every year, confirmed by laser ranging since 1969.",
    source: "真实来源",
  },
  {
    num: "№ 0420",
    category: "BIOLOGY",
    categoryColor: C.postmark,
    zh: "章鱼有三颗心脏，游泳时其中两颗会停跳。",
    en: "Octopuses have three hearts. Two stop when they swim.",
    source: "综合知识",
  },
  {
    num: "№ 0421",
    category: "HISTORY",
    categoryColor: C.marigold,
    zh: "克利奥帕特拉生活的年代，距登月比距建造大金字塔更近。",
    en: "Cleopatra's lifetime is closer to the Moon landing than to the Great Pyramid.",
    source: "综合知识",
  },
  {
    num: "№ 0422",
    category: "TECHNOLOGY",
    categoryColor: C.persimmon,
    zh: "英伟达来自数据中心和AI的收入在12年内增长了1300倍。",
    en: "Nvidia's data-center revenue grew 1300x in 12 years.",
    source: "Our World in Data",
  },
  {
    num: "№ 0423",
    category: "NEUROSCIENCE",
    categoryColor: C.marigold,
    zh: "大脑仅占体重的2%，却消耗全身约20%的能量。",
    en: "The brain is 2% of body weight but uses 20% of its energy.",
    source: "综合知识",
  },
];

// Resting fan: index 0 = bottom card, 5 = top card
const REST_POS = [
  { x: -10, y: 10, rotate: -5 },
  { x: -6,  y: 7,  rotate: -3 },
  { x: -3,  y: 4,  rotate: -1.5 },
  { x: 2,   y: 3,  rotate: 1 },
  { x: 6,   y: 2,  rotate: 2.5 },
  { x: 0,   y: 0,  rotate: 0 }, // top card: straight
] as const;

// Scatter positions at spreadFactor=1 (≥1280 px viewport).
// Letters tossed flat across a desk: wide horizontal spread, staggered y,
// varied rotations ±5-13°. x and y are scaled by spreadFactor at runtime;
// rotate stays fixed (doesn't affect viewport overflow).
const FAN_POS = [
  { x: -345, y: 52,  rotate: -12 },  // 0 — far left, slightly low
  { x: -200, y: 30,  rotate: -7 },   // 1
  { x: -70,  y: 68,  rotate: -5 },   // 2 — middle-left, drops lower
  { x: 130,  y: 44,  rotate: 7 },    // 3 — middle-right
  { x: 290,  y: 26,  rotate: 11 },   // 4 — far right
  { x: 0,    y: -48, rotate: 0 },    // 5 — top card lifts center
] as const;

const CARD_WIDTH = 320;
const CARD_HEIGHT = 280;

export function DispatchStack() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const reduce = useReducedMotion();

  // Responsive spread: 1.0 at ≥1280px, proportionally smaller below, min 0.3.
  // SSR-safe: initialise to 1 (assume desktop), update on first client render.
  const [spreadFactor, setSpreadFactor] = useState(1);
  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      setSpreadFactor(Math.min(1, Math.max(0.3, (w - 320) / (1280 - 320))));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const isFanning = hoveredIndex !== null && !reduce;

  return (
    // Entrance animation on the container — opacity never 0 at rest.
    // initial={false} when reduce = true → skips to animate target (opacity 1) immediately.
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: "easeOut", delay: 0.12 }}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: CARD_WIDTH + 32,
        // Extra height for the scatter state (cards travel ±48–68 px in y)
        height: CARD_HEIGHT + 160,
        margin: "36px auto 0",
        // overflow: visible so fanned cards can spread beyond bounds
      }}
    >
      {CARDS.map((card, i) => {
        const fan = FAN_POS[i];
        const pos = isFanning
          ? {
              x: fan.x * spreadFactor,
              y: fan.y * spreadFactor,
              rotate: fan.rotate,
            }
          : REST_POS[i];
        const isHovered = hoveredIndex === i;

        return (
          <motion.div
            key={card.num}
            // initial={false}: mount at the animate target with no opacity gate
            initial={false}
            animate={{
              x: pos.x,
              y: pos.y,
              rotate: pos.rotate,
              scale: isHovered ? 1.04 : 1,
              zIndex: isHovered ? 10 : i + 1,
            }}
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 160, damping: 18 }
            }
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              marginLeft: -(CARD_WIDTH / 2),
              width: CARD_WIDTH,
              background: C.paper0,
              borderRadius: 18,
              padding: "16px 18px 0 18px",
              borderBottom: `4px solid ${C.paperEdge}`,
              boxShadow: isHovered
                ? "0 18px 56px 0 rgba(20,17,13,0.52), inset 0 1px 0 rgba(255,255,255,0.22)"
                : "0 2px 14px 0 rgba(20,17,13,0.30), inset 0 1px 0 rgba(255,255,255,0.18)",
              cursor: "pointer",
              userSelect: "none",
            }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* № + category row */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  fontFamily:
                    "var(--font-space-mono), 'Courier New', monospace",
                  fontSize: 12,
                  color: C.persimmon,
                  letterSpacing: "0.05em",
                }}
              >
                {card.num}
              </span>
              <span
                style={{
                  fontFamily:
                    "var(--font-space-mono), 'Courier New', monospace",
                  fontSize: 9,
                  color: card.categoryColor,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                }}
              >
                {card.category}
              </span>
            </div>

            {/* ZH hook */}
            <p
              style={{
                fontFamily:
                  '"Songti SC", "Noto Serif SC", "Source Han Serif SC", serif',
                fontSize: 17,
                lineHeight: 1.5,
                color: C.paraInk,
                fontWeight: 600,
                marginBottom: 9,
                marginTop: 6,
              }}
            >
              {card.zh}
            </p>

            {/* EN hook */}
            <p
              style={{
                fontFamily: 'var(--font-fraunces), "Georgia", serif',
                fontSize: 13,
                lineHeight: 1.55,
                color: C.paraSoft,
                fontWeight: 400,
                marginBottom: card.whyCareZh ? 10 : 14,
              }}
            >
              {card.en}
            </p>

            {/* Why-care teaser — appears on one card as a feature preview */}
            {card.whyCareZh && (
              <>
                <hr
                  style={{
                    border: "none",
                    borderTop: `1px dashed ${C.paperEdge}`,
                    margin: "0 0 10px 0",
                  }}
                />
                <p
                  style={{
                    fontFamily:
                      '"Songti SC", "Noto Serif SC", serif',
                    fontSize: 11,
                    lineHeight: 1.55,
                    color: C.paraSoft,
                    marginBottom: 12,
                    fontStyle: "italic",
                  }}
                >
                  {card.whyCareZh}
                </p>
              </>
            )}

            {/* Source stamp — tilted per DESIGN.md */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                paddingBottom: 14,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontFamily:
                    "var(--font-space-mono), 'Courier New', monospace",
                  fontSize: 10,
                  color: C.postmark,
                  letterSpacing: "0.05em",
                  transform: "rotate(-1.2deg)",
                  transformOrigin: "left center",
                }}
              >
                ⌖ {card.source} ✓
              </span>
              <span
                style={{
                  fontFamily:
                    "var(--font-space-mono), 'Courier New', monospace",
                  fontSize: 8,
                  letterSpacing: "0.18em",
                  color: C.paraSoft,
                  textTransform: "uppercase",
                }}
              >
                OHLO
              </span>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
