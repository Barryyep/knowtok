"use client";

import { useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { FlipCard } from "@/components/flip-card";
import { useLanguage } from "@/lib/language-context";
import type { PaperCard } from "@/types/domain";

const SWIPE_THRESHOLD = 120;
const VELOCITY_THRESHOLD = 500;

const spring = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

interface SwipeDeckProps {
  paper: PaperCard;
  cardKey: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onImpact: (refresh?: boolean) => void;
  impactLoading: boolean;
}

export function SwipeDeck({
  paper,
  cardKey,
  onSwipeLeft,
  onSwipeRight,
  onImpact,
  impactLoading,
}: SwipeDeckProps) {
  const { t } = useLanguage();
  const [dragX, setDragX] = useState(0);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);

  const handleDrag = (_: unknown, info: PanInfo) => {
    setDragX(info.offset.x);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;

    if (offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD) {
      setExitDirection("left");
      onSwipeLeft();
    } else if (offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD) {
      setExitDirection("right");
      onSwipeRight();
    }

    setDragX(0);
  };

  const saveOpacity = Math.min(Math.max(dragX / SWIPE_THRESHOLD, 0), 1);
  const skipOpacity = Math.min(Math.max(-dragX / SWIPE_THRESHOLD, 0), 1);
  const rotation = (dragX / 600) * 8; // -8° to +8°

  return (
    <div className="relative">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={cardKey}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.9}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          style={{ rotate: rotation }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          exit={{
            x: exitDirection === "left" ? -400 : 400,
            opacity: 0,
            rotate: exitDirection === "left" ? -15 : 15,
          }}
          transition={spring}
          className="relative touch-pan-y"
        >
          {/* Swipe indicators */}
          <div
            className="swipe-indicator swipe-indicator-save"
            style={{ opacity: saveOpacity }}
          >
            {t.save}
          </div>
          <div
            className="swipe-indicator swipe-indicator-skip"
            style={{ opacity: skipOpacity }}
          >
            {t.skip}
          </div>

          <FlipCard
            paper={paper}
            onSave={onSwipeRight}
            onSkip={onSwipeLeft}
            onImpact={onImpact}
            impactLoading={impactLoading}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
