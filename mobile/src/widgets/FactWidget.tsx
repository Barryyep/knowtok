import { FlexWidget, TextWidget } from "react-native-android-widget";

import type { AppLanguage, DailyFact } from "../lib/types";
import { dispatchNumber } from "../components/slipUtils";
import { colors } from "../theme";

interface Props {
  fact: DailyFact | null;
  language: AppLanguage;
}

/**
 * Android home-screen widget. Rendered headlessly by
 * react-native-android-widget — only widget primitives allowed here.
 */
export function FactWidget({ fact, language }: Props) {
  const empty = language === "zh" ? "打开 Ohlo 生成今日信笺" : "Open Ohlo for today's dispatch";
  const sourceLine = fact
    ? fact.source.arxivId
      ? `⌖ arXiv:${fact.source.arxivId} ✓`
      : `⌖ ${fact.source.label} ✓`
    : "";
  const teaser =
    language === "zh" ? "打开,看这条为什么与你有关" : "Open to see why this one's for you";

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
          height: "match_parent",
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
              maxLines={4}
              style={{ fontSize: 15, color: colors.paraInk, marginTop: 6 }}
            />,
            // Bottom stamps: source truncates gracefully; teaser below it.
            <FlexWidget
              key="stamps"
              style={{ width: "match_parent", flexDirection: "column" }}
            >
              {[
                <TextWidget
                  key="source"
                  text={sourceLine}
                  maxLines={1}
                  style={{ fontSize: 10, color: colors.postmark }}
                />,
                <TextWidget
                  key="teaser"
                  text={teaser}
                  maxLines={1}
                  style={{ fontSize: 10, color: colors.paraSoft, marginTop: 2 }}
                />,
              ]}
            </FlexWidget>,
          ]
        ) : (
          <TextWidget text={empty} style={{ fontSize: 14, color: colors.paraSoft }} />
        )}
      </FlexWidget>
      {/* fold edge */}
      <FlexWidget style={{ height: 4, width: "match_parent", backgroundColor: colors.paperEdge }} />
    </FlexWidget>
  );
}
