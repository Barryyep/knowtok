import { FlexWidget, TextWidget } from "react-native-android-widget";

import type { AppLanguage, DailyFact } from "../lib/types";
import { dispatchNumber } from "../components/slipUtils";

interface Props {
  fact: DailyFact | null;
  language: AppLanguage;
}

// The Daily Dispatch — the widget IS a cream slip now.
const PAPER = "#F3E9D6";
const PAPER_EDGE = "#E4D6BC";
const PARA_INK = "#241E15";
const PARA_SOFT = "#6B5E48";
const PERSIMMON = "#EC4A24";
const MARIGOLD = "#F2A63B";
const POSTMARK = "#1C5C63";

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
        backgroundColor: PAPER,
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
                style={{ fontSize: 13, color: PERSIMMON, fontWeight: "bold" }}
              />
              <TextWidget text={fact.date} style={{ fontSize: 11, color: MARIGOLD }} />
            </FlexWidget>
            <TextWidget
              text={fact.fact}
              maxLines={4}
              style={{ fontSize: 15, color: PARA_INK, marginTop: 6 }}
            />
            <TextWidget
              text={sourceLine}
              maxLines={1}
              style={{ fontSize: 11, color: POSTMARK, marginTop: 6 }}
            />
          </>
        ) : (
          <TextWidget text={empty} style={{ fontSize: 14, color: PARA_SOFT }} />
        )}
      </FlexWidget>
      {/* fold edge */}
      <FlexWidget style={{ height: 4, width: "match_parent", backgroundColor: PAPER_EDGE }} />
    </FlexWidget>
  );
}
