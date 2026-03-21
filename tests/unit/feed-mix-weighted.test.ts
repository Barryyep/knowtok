import { describe, expect, test } from "vitest";
import { weightedShuffle } from "@/lib/feed-mix";
import type { PaperCard } from "@/types/domain";

function makePaper(id: number, category: string): PaperCard {
  return {
    id: `paper-${id}`,
    arxivIdBase: `2501.${id}`,
    arxivIdVersion: 1,
    title: `Paper ${id}`,
    hookSummaryEn: "A hook",
    personalizedHook: "A personalized hook",
    plainSummary: "A plain summary",
    humanCategory: category,
    tags: ["tag"],
    primaryCategory: "cs.AI",
    categories: ["cs.AI"],
    publishedAt: new Date().toISOString(),
    absUrl: `https://arxiv.org/abs/2501.${id}`,
    pdfUrl: null,
    saved: false,
  };
}

describe("weightedShuffle", () => {
  test("returns all items", () => {
    const items = [
      makePaper(1, "AI & Robots"),
      makePaper(2, "Your Health"),
      makePaper(3, "Climate"),
    ];
    const result = weightedShuffle(items, ["AI & Robots"], {
      "AI & Robots": "AI & Robots",
    });
    expect(result).toHaveLength(3);
  });

  test("matching categories appear more often near the front", () => {
    const items = Array.from({ length: 20 }, (_, i) =>
      makePaper(i, i < 10 ? "AI & Robots" : "Climate"),
    );

    let matchingInTop5 = 0;
    const iterations = 100;

    for (let i = 0; i < iterations; i++) {
      const result = weightedShuffle(items, ["AI & Robots"], {
        "AI & Robots": "AI & Robots",
      });
      matchingInTop5 += result
        .slice(0, 5)
        .filter((p) => p.humanCategory === "AI & Robots").length;
    }

    // With 3x weight, AI & Robots should be ~75% of top 5 (vs 50% without weighting)
    const avgMatching = matchingInTop5 / iterations;
    expect(avgMatching).toBeGreaterThan(3); // More than 3 out of 5 on average
  });

  test("handles empty curiosity tags (no weighting)", () => {
    const items = [makePaper(1, "AI & Robots"), makePaper(2, "Climate")];
    const result = weightedShuffle(items, [], {});
    expect(result).toHaveLength(2);
  });

  test("handles empty items array", () => {
    const result = weightedShuffle([], ["AI & Robots"], {
      "AI & Robots": "AI & Robots",
    });
    expect(result).toHaveLength(0);
  });

  test("preserves all items without duplicates", () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      makePaper(i, i % 2 === 0 ? "AI & Robots" : "Your Health"),
    );
    const result = weightedShuffle(items, ["AI & Robots"], {
      "AI & Robots": "AI & Robots",
    });
    expect(result).toHaveLength(10);
    const ids = result.map((p) => p.id);
    expect(new Set(ids).size).toBe(10);
  });

  test("works with single item", () => {
    const items = [makePaper(1, "Climate")];
    const result = weightedShuffle(items, ["AI & Robots"], {
      "AI & Robots": "AI & Robots",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("paper-1");
  });

  test("works when all items match curiosity tags", () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      makePaper(i, "AI & Robots"),
    );
    const result = weightedShuffle(items, ["AI & Robots"], {
      "AI & Robots": "AI & Robots",
    });
    expect(result).toHaveLength(5);
  });

  test("works when no items match curiosity tags", () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      makePaper(i, "Climate"),
    );
    const result = weightedShuffle(items, ["Your Health"], {
      "Your Health": "Your Health",
    });
    expect(result).toHaveLength(5);
  });
});
