import type { DailyFact } from "./types";

// swap when the real domain lands
export const SHARE_BASE_URL = "https://ohlo.app";

export function buildShareUrl(fact: DailyFact): string {
  if (fact.source.kind === "paper" && fact.source.paperId) {
    return `${SHARE_BASE_URL}/s/${fact.source.paperId}`;
  }
  return `${SHARE_BASE_URL}/s/daily`;
}
