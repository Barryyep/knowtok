/**
 * DispatchStack — V3 hero component.
 *
 * Six dispatch cards fanned like a pile of mail on a desk.
 * Desktop hover: stack scatters wide like letters tossed across a desk.
 * Touch / no-hover: static gentle fan — no JS interaction.
 *
 * locale prop: "zh" shows zh hero text; "en" shows en hero text.
 * Each visitor sees ONE language; no stacked bilingual copy.
 *
 * Motion approach: framer-motion animate prop drives all transforms.
 * initial={false} on each card → cards snap to resting position on mount
 * with no opacity gate. Entrance is handled on the container only,
 * guarded by useReducedMotion → opacity is always 1 at rest.
 *
 * Responsive spread: spreadFactor derived from container width via
 * ResizeObserver. 1.0 at 1280px; scales proportionally above and below
 * (no upper cap — wide viewports get wider scatter; min 0.3 on mobile).
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Locale } from "@/lib/marketing-copy";

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
  source: { zh: string; en: string };
  whyCare?: { zh: string; en: string };
}

const CARDS: DispatchCard[] = [
  {
    num: "№ 0418",
    category: "GLOBAL HEALTH",
    categoryColor: C.marigold,
    zh: "在乍得，大约每25个女孩中就有1人会因为怀孕相关原因而去世。",
    en: "In Chad, roughly 1 in 25 girls will die from pregnancy-related causes in her lifetime.",
    source: { zh: "Our World in Data", en: "Our World in Data" },
    whyCare: {
      zh: "为什么这条跟你有关：你在乎的人生活在一个系统性不平等里。",
      en: "Why this matters to you: the people you care about live inside systemic inequality.",
    },
  },
  {
    num: "№ 0419",
    category: "ASTRONOMY",
    categoryColor: C.postmark,
    zh: "月球每年远离地球3.8厘米，自1969年起由激光测距持续确认。",
    en: "The Moon drifts 3.8 cm farther from Earth every year, confirmed by laser ranging since 1969.",
    source: { zh: "真实来源", en: "Real Sources" },
  },
  {
    num: "№ 0420",
    category: "BIOLOGY",
    categoryColor: C.postmark,
    zh: "章鱼有三颗心脏，游泳时其中两颗会停跳。",
    en: "Octopuses have three hearts. Two stop when they swim.",
    source: { zh: "综合知识", en: "General Knowledge" },
  },
  {
    num: "№ 0421",
    category: "HISTORY",
    categoryColor: C.marigold,
    zh: "克利奥帕特拉生活的年代，距登月比距建造大金字塔更近。",
    en: "Cleopatra's lifetime is closer to the Moon landing than to the Great Pyramid.",
    source: { zh: "综合知识", en: "General Knowledge" },
  },
  {
    num: "№ 0422",
    category: "TECHNOLOGY",
    categoryColor: C.persimmon,
    zh: "英伟达来自数据中心和AI的收入在12年内增长了1300倍。",
    en: "Nvidia's data-center revenue grew 1300x in 12 years.",
    source: { zh: "Our World in Data", en: "Our World in Data" },
  },
  {
    num: "№ 0423",
    category: "NEUROSCIENCE",
    categoryColor: C.marigold,
    zh: "大脑仅占体重的2%，却消耗全身约20%的能量。",
    en: "The brain is 2% of body weight but uses 20% of its energy.",
    source: { zh: "综合知识", en: "General Knowledge" },
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

// Scatter positions at spreadFactor=1 (>=1280 px viewport).
const FAN_POS = [
  { x: -345, y: 52,  rotate: -12 },
  { x: -200, y: 30,  rotate: -7 },
  { x: -70,  y: 68,  rotate: -5 },
  { x: 130,  y: 44,  rotate: 7 },
  { x: 290,  y: 26,  rotate: 11 },
  { x: 0,    y: -48, rotate: 0 },
] as const;

const CARD_WIDTH = 320;
const CARD_HEIGHT = 280;

export function DispatchStack({ locale }: { locale: Locale }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const reduce = useReducedMotion();

  const containerRef = useRef<HTMLDivElement>(null);
  const [spreadFactor, setSpreadFactor] = useState(1);
  useEffect(() => {
    function update(w: number) {
      setSpreadFactor(Math.max(0.3, w / 1280));
    }
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      update(entry.contentRect.width)
    );
    ro.observe(el);
    update(el.getBoundingClientRect().width || window.innerWidth);
    return () => ro.disconnect();
  }, []);

  const isFanning = hoveredIndex !== null && !reduce;

  // Font family for the hero text depends on locale
  const heroFont =
    locale === "zh"
      ? '"Songti SC", "Noto Serif SC", "Source Han Serif SC", serif'
      : 'var(--font-fraunces), "Georgia", serif';

  return (
    <motion.div
      ref={containerRef}
      initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: "easeOut", delay: 0.12 }}
      style={{
        position: "relative",
        width: "100%",
        height: CARD_HEIGHT + Math.max(160, Math.ceil(160 * spreadFactor)),
        margin: "36px auto 0",
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
        const heroText = locale === "zh" ? card.zh : card.en;
        const sourceText = card.source[locale];
        const whyCareText = card.whyCare?.[locale];

        return (
          <motion.div
            key={card.num}
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

            {/* Hero fact — single locale */}
            <p
              style={{
                fontFamily: heroFont,
                fontSize: locale === "zh" ? 17 : 15,
                lineHeight: 1.5,
                color: C.paraInk,
                fontWeight: 600,
                marginBottom: whyCareText ? 9 : 14,
                marginTop: 6,
              }}
            >
              {heroText}
            </p>

            {/* Why-care teaser — appears on one card as a feature preview */}
            {whyCareText && (
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
                      locale === "zh"
                        ? '"Songti SC", "Noto Serif SC", serif'
                        : 'var(--font-fraunces), "Georgia", serif',
                    fontSize: 11,
                    lineHeight: 1.55,
                    color: C.paraSoft,
                    marginBottom: 12,
                    fontStyle: "italic",
                  }}
                >
                  {whyCareText}
                </p>
              </>
            )}

            {/* Source stamp */}
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
                ⌖ {sourceText} ✓
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
