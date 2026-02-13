import { describe, expect, test } from "vitest";
import { mixFeedItems } from "@/lib/feed-mix";
import type { PaperCard } from "@/types/domain";

function makePaper(id: number): PaperCard {
  return {
    id: `paper-${id}`,
    arxivIdBase: `2501.${id}`,
    arxivIdVersion: 1,
    title: `Paper ${id}`,
    hookSummaryEn: "A short summary",
    tags: ["tag"],
    primaryCategory: "cs.AI",
    categories: ["cs.AI"],
    publishedAt: new Date().toISOString(),
    absUrl: `https://arxiv.org/abs/2501.${id}`,
    pdfUrl: null,
    saved: false,
  };
}

describe("mixFeedItems", () => {
  test("prioritizes latest while mixing random fallback", () => {
    const latest = Array.from({ length: 20 }, (_, index) => makePaper(index + 1));
    const randomPool = Array.from({ length: 20 }, (_, index) => makePaper(index + 50));

    const result = mixFeedItems({
      latest,
      randomPool,
      limit: 10,
      latestRatio: 0.7,
    });

    expect(result).toHaveLength(10);
    const ids = result.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    const fromLatest = result.filter((item) => Number.parseInt(item.id.split("-")[1], 10) < 50).length;
    expect(fromLatest).toBeGreaterThanOrEqual(7);
  });

  test("backs off to available unique items", () => {
    const latest = [makePaper(1), makePaper(2)];
    const randomPool = [makePaper(2), makePaper(3)];

    const result = mixFeedItems({
      latest,
      randomPool,
      limit: 5,
    });

    expect(result).toHaveLength(3);
    expect(result.map((paper) => paper.id)).toEqual(["paper-1", "paper-2", "paper-3"]);
  });
});
