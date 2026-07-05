import { FlexWidget, TextWidget } from "react-native-android-widget";

import type { AppLanguage, DailyFact } from "../lib/types";
import { dispatchNumber } from "../components/slipUtils";
import { colors } from "../theme";

interface Props {
  fact: DailyFact | null;
  language: AppLanguage;
  size?: "small" | "wide";
}

/**
 * Android home-screen widget. Rendered headlessly by
 * react-native-android-widget — only widget primitives allowed here.
 */
export function FactWidget({ fact, language, size = "wide" }: Props) {
  const empty = language === "zh" ? "打开 Ohlo 生成今日信笺" : "Open Ohlo for today's dispatch";
  const sourceLine = fact
    ? fact.source.arxivId
      ? `⌖ arXiv:${fact.source.arxivId} ✓`
      : `⌖ ${fact.source.label} ✓`
    : "";
  const ctaText = language === "zh" ? "寄给你的理由" : "Why it found you";

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: colors.paper0,
        borderRadius: 22,
        flexDirection: "column",
      }}
    >
      <FlexWidget
        style={{
          flex: 1,
          width: "match_parent",
          padding: 14,
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* NOTE: react-native-android-widget's renderer cannot handle React
            fragments (<>…</> throws "Symbol(react.fragment) is not a
            function") — children must be an array or direct elements. */}
        {fact ? (
          [
            <FlexWidget
              key="top"
              style={{
                width: "match_parent",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              {/* № de-emphasized: smaller, muted — date carries presence via marigold */}
              <TextWidget
                text={`№ ${dispatchNumber(fact.source.factId)}`}
                style={{ fontSize: 10, color: colors.paraSoft }}
              />
              <TextWidget text={fact.date} style={{ fontSize: 11, color: colors.marigold }} />
            </FlexWidget>,
            <TextWidget
              key="fact"
              text={fact.fact}
              maxLines={size === "small" ? 2 : 3}
              style={{ fontSize: 15, color: colors.paraInk, marginTop: 6 }}
            />,
            // Bottom row: source stamp (left) + CTA pill (right) for wide;
            // pill only for small — stamp dropped to give pill room.
            size === "wide" ? (
              <FlexWidget
                key="bottom"
                style={{
                  width: "match_parent",
                  height: 28,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                {[
                  <FlexWidget
                    key="stamp-col"
                    style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
                  >
                    {[
                      <TextWidget
                        key="source"
                        text={sourceLine}
                        maxLines={1}
                        style={{ fontSize: 10, color: colors.postmark }}
                      />,
                    ]}
                  </FlexWidget>,
                  <FlexWidget
                    key="cta"
                    style={{
                      backgroundColor: colors.persimmon,
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {[
                      <TextWidget
                        key="cta-text"
                        text={ctaText}
                        maxLines={1}
                        style={{ fontSize: 11, color: colors.paper0 }}
                      />,
                    ]}
                  </FlexWidget>,
                ]}
              </FlexWidget>
            ) : (
              <FlexWidget
                key="bottom"
                style={{ width: "match_parent", height: 28, flexDirection: "row", alignItems: "center" }}
              >
                {[
                  <FlexWidget
                    key="cta"
                    style={{
                      backgroundColor: colors.persimmon,
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {[
                      <TextWidget
                        key="cta-text"
                        text={ctaText}
                        maxLines={1}
                        style={{ fontSize: 11, color: colors.paper0 }}
                      />,
                    ]}
                  </FlexWidget>,
                ]}
              </FlexWidget>
            ),
          ]
        ) : (
          <TextWidget text={empty} style={{ fontSize: 14, color: colors.paraSoft }} />
        )}
      </FlexWidget>
      {/* No fold edge at widget scale — it reads as a stray gray bar. */}
    </FlexWidget>
  );
}
