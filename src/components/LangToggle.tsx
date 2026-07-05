"use client";

import type { Locale } from "@/lib/marketing-copy";
import { COPY } from "@/lib/marketing-copy";

const C = {
  inkMuted: "#9A8D74",
  inkText: "#EDE3D0",
};

export function LangToggle({ locale }: { locale: Locale }) {
  const copy = COPY[locale];

  function handleSwitch() {
    // Set cookie so middleware uses this preference on next visit to /
    const maxAge = 60 * 60 * 24 * 365; // 1 year
    document.cookie = `lang=${locale === "zh" ? "en" : "zh"}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-space-mono), 'Courier New', monospace",
        fontSize: 10,
        letterSpacing: "0.14em",
      }}
    >
      {/* Current locale — inked */}
      <span
        style={{
          color: C.inkText,
          textTransform: "uppercase",
        }}
      >
        {locale === "zh" ? "中文" : "EN"}
      </span>
      <span style={{ color: C.inkMuted, opacity: 0.5 }}>·</span>
      {/* Sibling locale — link */}
      <a
        href={copy.toggleHref}
        onClick={handleSwitch}
        style={{
          color: C.inkMuted,
          textDecoration: "none",
          textTransform: "uppercase",
          transition: "color 120ms ease",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLAnchorElement).style.color = C.inkText)
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLAnchorElement).style.color = C.inkMuted)
        }
      >
        {copy.toggleLabel}
      </a>
    </div>
  );
}
