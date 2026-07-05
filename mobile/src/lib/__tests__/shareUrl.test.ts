import { describe, it, expect } from "vitest";
import { buildShareUrl, SHARE_BASE_URL } from "../shareUrl";
import type { DailyFact } from "../types";

function makeFact(overrides: Partial<DailyFact> = {}): DailyFact {
  return {
    date: "2026-07-05",
    emoji: "📰",
    topic: "Tech & AI",
    fact: "Test.",
    whyCare: "",
    source: {
      kind: "paper",
      factId: "uuid-abc",
      label: "arXiv",
      paperId: "uuid-abc",
    },
    ...overrides,
  };
}

describe("buildShareUrl", () => {
  it("paper fact with paperId → /s/{paperId}", () => {
    const url = buildShareUrl(makeFact());
    expect(url).toBe(`${SHARE_BASE_URL}/s/uuid-abc`);
  });

  it("paper fact without paperId → /s/daily fallback", () => {
    const url = buildShareUrl(
      makeFact({ source: { kind: "paper", factId: "uuid-abc", label: "" } }),
    );
    expect(url).toBe(`${SHARE_BASE_URL}/s/daily`);
  });

  it("general fact → /s/daily", () => {
    const url = buildShareUrl(
      makeFact({ source: { kind: "general", factId: "hash-xyz", label: "综合知识" } }),
    );
    expect(url).toBe(`${SHARE_BASE_URL}/s/daily`);
  });

  it("URL always starts with SHARE_BASE_URL", () => {
    const url = buildShareUrl(makeFact());
    expect(url.startsWith(SHARE_BASE_URL)).toBe(true);
  });
});
