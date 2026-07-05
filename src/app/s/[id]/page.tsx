import type { Metadata } from "next";
import { Fraunces, Space_Mono } from "next/font/google";
import { createClient } from "@supabase/supabase-js";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "600"],
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
  display: "swap",
});

// djb2 hash — algorithm is IDENTICAL to mobile/src/components/slipUtils.ts
function dispatchNumber(factId: string): number {
  const id = factId ?? "";
  let h = 5381 >>> 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (Math.imul(h, 33) + id.charCodeAt(i)) >>> 0;
  }
  return 1000 + (h % 9000);
}

interface PaperRow {
  id: string;
  title: string | null;
  hook_summary_en: string | null;
  hook_summary_zh: string | null;
  human_category: string | null;
  published_at: string | null;
  abs_url: string | null;
  metadata: Record<string, unknown> | null;
}

async function fetchPaper(id: string): Promise<PaperRow | null> {
  try {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      process.env.EXPO_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!url) return null;
    // Prefer service role to bypass potential RLS; fall back to anon key
    const key = serviceKey ?? anonKey;
    if (!key) return null;

    const client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await client
      .from("papers")
      .select(
        "id, title, hook_summary_en, hook_summary_zh, human_category, published_at, abs_url, metadata"
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return data as PaperRow;
  } catch {
    return null;
  }
}

function sourceLabel(
  absUrl: string | null,
  metadata: Record<string, unknown> | null
): string {
  if (metadata?.venue && typeof metadata.venue === "string") {
    return metadata.venue;
  }
  if (!absUrl) return "source";
  try {
    const u = new URL(absUrl);
    if (u.hostname.includes("arxiv.org")) {
      const m = u.pathname.match(/\/(?:abs|pdf)\/(.+)/);
      return m ? `arXiv:${m[1]}` : "arXiv";
    }
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function formatDate(publishedAt: string | null): string {
  if (!publishedAt) return "";
  const d = new Date(publishedAt);
  if (isNaN(d.getTime())) return "";
  const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const MONTHS = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
  ];
  return `${DAYS[d.getUTCDay()]} · ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

// Design-system tokens from DESIGN.md
const C = {
  ink900: "#14110D",
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

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const generic: Metadata = {
    title: "Ohlo — One thing worth stopping for, every day.",
    description: "Ohlo — one thing worth stopping for, every day.",
    openGraph: {
      title: "Ohlo — One thing worth stopping for, every day.",
      description: "Ohlo — one thing worth stopping for, every day.",
    },
  };
  if (id === "daily") return generic;
  const paper = await fetchPaper(id);
  if (!paper) return generic;
  const hookEn =
    paper.hook_summary_en ?? "One thing worth stopping for, every day.";
  return {
    title: hookEn,
    description: "Ohlo — one thing worth stopping for, every day.",
    openGraph: {
      title: hookEn,
      description: "Ohlo — one thing worth stopping for, every day.",
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { id } = await params;
  const paper = id !== "daily" ? await fetchPaper(id) : null;

  return (
    <div
      className={`${fraunces.variable} ${spaceMono.variable}`}
      style={{
        minHeight: "100vh",
        background: C.ink900,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        {paper ? <PaperContent paper={paper} /> : <GenericContent />}
      </div>
    </div>
  );
}

function GenericContent() {
  return (
    <>
      {/* Wordmark */}
      <p
        style={{
          fontFamily: "var(--font-space-mono), 'Courier New', monospace",
          fontSize: 11,
          letterSpacing: "0.2em",
          color: C.inkMuted,
          textAlign: "center",
          marginBottom: 16,
          textTransform: "uppercase",
        }}
      >
        OHLO · DAILY DISPATCH
      </p>

      {/* Pitch */}
      <p
        style={{
          color: C.inkText,
          fontSize: 16,
          textAlign: "center",
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        <span style={{ display: "block" }}>每天一条，值得停下来的知识。</span>
        <span
          style={{
            display: "block",
            fontFamily: "var(--font-space-mono), 'Courier New', monospace",
            fontSize: 12,
            color: C.inkMuted,
            marginTop: 6,
          }}
        >
          One thing worth stopping for, every day.
        </span>
      </p>

      {/* Empty slip mockup */}
      <div
        style={{
          background: C.paper0,
          borderRadius: 18,
          padding: "20px 20px 0 20px",
          borderBottom: `4px solid ${C.paperEdge}`,
          marginBottom: 24,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 13,
              color: C.persimmon,
              letterSpacing: "0.05em",
            }}
          >
            № ----
          </span>
        </div>

        {/* Empty body placeholder */}
        <div style={{ height: 72 }} />

        {/* Wordmark in fold */}
        <div
          style={{
            borderTop: `1px dashed ${C.paperEdge}`,
            paddingTop: 12,
            paddingBottom: 20,
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 9,
              letterSpacing: "0.2em",
              color: C.paraSoft,
              textTransform: "uppercase",
            }}
          >
            OHLO · DAILY DISPATCH
          </span>
        </div>
      </div>

      <CtaButton />
    </>
  );
}

function PaperContent({ paper }: { paper: PaperRow }) {
  const num = dispatchNumber(paper.id);
  const dateStr = formatDate(paper.published_at);
  const src = sourceLabel(paper.abs_url, paper.metadata);
  const eyebrow = [paper.human_category, dateStr].filter(Boolean).join(" · ");

  return (
    <>
      {/* Slip */}
      <div
        style={{
          background: C.paper0,
          borderRadius: 18,
          padding: "20px 20px 0 20px",
          borderBottom: `4px solid ${C.paperEdge}`,
          marginBottom: 24,
        }}
      >
        {/* № + First Class seal */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: eyebrow ? 4 : 16,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 13,
              color: C.persimmon,
              letterSpacing: "0.05em",
            }}
          >
            № {num}
          </span>
          <span
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 9,
              color: C.persimmon,
              letterSpacing: "0.12em",
              border: `1px solid ${C.persimmon}`,
              padding: "2px 6px",
              borderRadius: 4,
              textTransform: "uppercase",
            }}
          >
            FIRST CLASS · 头等件
          </span>
        </div>

        {/* Category + date eyebrow */}
        {eyebrow && (
          <p
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 10,
              color: C.marigold,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            {eyebrow}
          </p>
        )}

        {/* ZH hook — hero, zh-first per spec */}
        {paper.hook_summary_zh && (
          <p
            style={{
              fontSize: 22,
              lineHeight: 1.5,
              color: C.paraInk,
              marginBottom: 12,
              fontFamily:
                '"Songti SC", "Noto Serif SC", "Source Han Serif SC", serif',
              fontWeight: 600,
            }}
          >
            {paper.hook_summary_zh}
          </p>
        )}

        {/* EN hook */}
        {paper.hook_summary_en && (
          <p
            style={{
              fontFamily: 'var(--font-fraunces), "Georgia", serif',
              fontSize: 17,
              lineHeight: 1.55,
              color: C.paraSoft,
              marginBottom: 20,
              fontWeight: 500,
            }}
          >
            {paper.hook_summary_en}
          </p>
        )}

        {/* Dashed divider */}
        <hr
          style={{
            border: "none",
            borderTop: `1px dashed ${C.paperEdge}`,
            margin: "0 0 14px 0",
          }}
        />

        {/* Source stamp — tilted -1.2deg (hand-stamped feel) */}
        {paper.abs_url ? (
          <a
            href={paper.abs_url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-block",
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 11,
              color: C.postmark,
              letterSpacing: "0.05em",
              textDecoration: "none",
              transform: "rotate(-1.2deg)",
              transformOrigin: "left center",
              marginBottom: 16,
            }}
          >
            ⌖ {src} ✓
          </a>
        ) : (
          <p
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 11,
              color: C.postmark,
              letterSpacing: "0.05em",
              marginBottom: 16,
            }}
          >
            ⌖ {src} ✓
          </p>
        )}

        {/* Wordmark in fold */}
        <div
          style={{
            paddingTop: 12,
            paddingBottom: 20,
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 9,
              letterSpacing: "0.2em",
              color: C.paraSoft,
              textTransform: "uppercase",
            }}
          >
            OHLO · DAILY DISPATCH
          </span>
        </div>
      </div>

      <CtaButton />
    </>
  );
}

function CtaButton() {
  return (
    <div style={{ textAlign: "center" }}>
      <a
        href="#"
        data-todo="appstore-link"
        style={{
          display: "inline-block",
          background: C.persimmon,
          color: "#FFFFFF",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: "0.02em",
          padding: "12px 32px",
          borderRadius: 9999,
          textDecoration: "none",
        }}
      >
        获取 Ohlo · Get Ohlo
      </a>
    </div>
  );
}
