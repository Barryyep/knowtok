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
  const empty = language === "zh" ? "打开 KnowTok 生成今日信笺" : "Open KnowTok for today's dispatch";
  const sourceLine = fact
    ? fact.source.arxivId
      ? `⌖ arXiv:${fact.source.arxivId} ✓`
      : `⌖ ${fact.source.label} ✓`
    : "";

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
        {fact ? (
          <>
            <FlexWidget
              style={{
                width: "match_parent",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <TextWidget
                text={`№ ${dispatchNumber(fact.source.factId)}`}
                style={{ fontSize: 13, color: colors.persimmon, fontWeight: "bold" }}
              />
              <TextWidget text={fact.date} style={{ fontSize: 11, color: colors.marigold }} />
            </FlexWidget>
            <TextWidget
              text={fact.fact}
              maxLines={4}
              style={{ fontSize: 15, color: colors.paraInk, marginTop: 6 }}
            />
            <TextWidget
              text={sourceLine}
              maxLines={1}
              style={{ fontSize: 11, color: colors.postmark, marginTop: 6 }}
            />
          </>
        ) : (
          <TextWidget text={empty} style={{ fontSize: 14, color: colors.paraSoft }} />
        )}
      </FlexWidget>
      {/* fold edge */}
      <FlexWidget style={{ height: 4, width: "match_parent", backgroundColor: colors.paperEdge }} />
    </FlexWidget>
  );
}
