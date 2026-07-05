import { Fraunces, Space_Mono } from "next/font/google";
import type { Metadata } from "next";

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

// Design-system tokens from DESIGN.md — identical to /s landing
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

export const metadata: Metadata = {
  title: "Ohlo — 每日信笺 Daily Dispatch",
  description:
    "Delivered to your lock screen and home screen, from real papers and data, stamped with its source.",
};

export default function HomePage() {
  return (
    <div
      className={`${fraunces.variable} ${spaceMono.variable}`}
      style={{
        minHeight: "100vh",
        background: C.ink900,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 16px 64px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Wordmark eyebrow */}
        <p
          style={{
            fontFamily: "var(--font-space-mono), 'Courier New', monospace",
            fontSize: 11,
            letterSpacing: "0.2em",
            color: C.inkMuted,
            textAlign: "center",
            textTransform: "uppercase",
            marginBottom: 32,
          }}
        >
          OHLO · DAILY DISPATCH
        </p>

        {/* Hero headline */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <p
            style={{
              fontFamily: '"Songti SC", "Noto Serif SC", "Source Han Serif SC", serif',
              fontSize: 28,
              fontWeight: 600,
              lineHeight: 1.5,
              color: C.inkText,
              marginBottom: 12,
            }}
          >
            每天一条，值得停下来的知识。
          </p>
          <p
            style={{
              fontFamily: 'var(--font-fraunces), "Georgia", serif',
              fontSize: 17,
              lineHeight: 1.55,
              color: C.inkMuted,
              fontWeight: 400,
            }}
          >
            One thing worth stopping for, every day.
          </p>

          <p
            style={{
              fontFamily: '"Songti SC", "Noto Serif SC", serif',
              fontSize: 14,
              lineHeight: 1.7,
              color: C.inkMuted,
              marginTop: 16,
            }}
          >
            印在你的锁屏和桌面上，来自真实的论文与数据，盖着出处的邮戳。
          </p>
          <p
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 11,
              lineHeight: 1.7,
              color: C.inkMuted,
              marginTop: 6,
              letterSpacing: "0.02em",
            }}
          >
            Delivered to your lock screen and home screen,
            <br />
            from real papers and data, stamped with its source.
          </p>
        </div>

        {/* Example slip */}
        <div
          style={{
            background: C.paper0,
            borderRadius: 18,
            padding: "20px 20px 0 20px",
            borderBottom: `4px solid ${C.paperEdge}`,
            marginBottom: 48,
          }}
        >
          {/* № + seal row */}
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
                fontFamily: "var(--font-space-mono), 'Courier New', monospace",
                fontSize: 13,
                color: C.persimmon,
                letterSpacing: "0.05em",
              }}
            >
              № 2307
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

          {/* Category eyebrow */}
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
            GLOBAL HEALTH
          </p>

          {/* ZH hook — hero */}
          <p
            style={{
              fontFamily: '"Songti SC", "Noto Serif SC", "Source Han Serif SC", serif',
              fontSize: 22,
              lineHeight: 1.5,
              color: C.paraInk,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            在乍得，大约每25个女孩中就有1人会因为怀孕相关原因而去世。
          </p>

          {/* EN hook */}
          <p
            style={{
              fontFamily: 'var(--font-fraunces), "Georgia", serif',
              fontSize: 17,
              lineHeight: 1.55,
              color: C.paraSoft,
              fontWeight: 500,
              marginBottom: 20,
            }}
          >
            In Chad, roughly 1 in 25 girls will die from pregnancy-related causes
            in her lifetime.
          </p>

          {/* Dashed divider */}
          <hr
            style={{
              border: "none",
              borderTop: `1px dashed ${C.paperEdge}`,
              margin: "0 0 14px 0",
            }}
          />

          {/* Source stamp — tilted -1.2deg (hand-stamped feel) */}
          <p
            style={{
              display: "inline-block",
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 11,
              color: C.postmark,
              letterSpacing: "0.05em",
              transform: "rotate(-1.2deg)",
              transformOrigin: "left center",
              marginBottom: 16,
            }}
          >
            ⌖ Our World in Data ✓
          </p>

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

        {/* Three-point section */}
        <div style={{ marginBottom: 48 }}>
          {[
            {
              zh: "组件上门",
              en: "Widget on-screen",
              bodyZh: "不用打开 app，信就在锁屏上",
              bodyEn: "The dispatch lands on your lock screen and home screen. No tap required.",
            },
            {
              zh: "真实来源",
              en: "Real sources",
              bodyZh: "每条都盖出处邮戳，论文轨是当天的真论文",
              bodyEn: "Every dispatch carries a source stamp. The paper trail is the day's real paper.",
            },
            {
              zh: "越读越懂你",
              en: "Learns as you read",
              bodyZh: "你读什么，它就跟着变",
              bodyEn: "Read more, get better dispatches. It adapts to what you stop for.",
            },
          ].map((point) => (
            <div
              key={point.zh}
              style={{
                borderTop: `1px solid #2A251C`,
                paddingTop: 20,
                paddingBottom: 20,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-space-mono), 'Courier New', monospace",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  color: C.persimmon,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {point.en}
              </p>
              <p
                style={{
                  fontFamily: '"Songti SC", "Noto Serif SC", serif',
                  fontSize: 18,
                  fontWeight: 600,
                  lineHeight: 1.5,
                  color: C.inkText,
                  marginBottom: 6,
                }}
              >
                {point.zh}
              </p>
              <p
                style={{
                  fontFamily: '"Songti SC", "Noto Serif SC", serif',
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: C.inkMuted,
                  marginBottom: 4,
                }}
              >
                {point.bodyZh}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-fraunces), "Georgia", serif',
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: C.inkMuted,
                }}
              >
                {point.bodyEn}
              </p>
            </div>
          ))}
          <div style={{ borderTop: `1px solid #2A251C` }} />
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <a
            href="#"
            data-todo="appstore-link"
            style={{
              display: "inline-block",
              background: C.persimmon,
              color: "#FFFFFF",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "0.02em",
              padding: "14px 40px",
              borderRadius: 9999,
              textDecoration: "none",
              marginBottom: 12,
            }}
          >
            获取 Ohlo / Get Ohlo
          </a>
          <p
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 11,
              color: C.inkMuted,
              letterSpacing: "0.08em",
              marginTop: 8,
            }}
          >
            App Store · 即将上线 / coming soon
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            borderTop: `1px solid #2A251C`,
            paddingTop: 24,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-space-mono), 'Courier New', monospace",
              fontSize: 10,
              letterSpacing: "0.2em",
              color: C.inkMuted,
              textTransform: "uppercase",
            }}
          >
            OHLO · DAILY DISPATCH · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
