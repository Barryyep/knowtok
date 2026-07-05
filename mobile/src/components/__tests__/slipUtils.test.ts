/**
 * dispatchNumber stability tests — pin exact hash values so the Swift
 * widget/watch implementation can't drift silently. If any of these break
 * after a refactor, the cross-surface contract is broken.
 */
import { describe, it, expect } from "vitest";
import { dispatchNumber, formatDispatch, streakCount, formatEyebrow } from "../slipUtils";
import type { DailyFact } from "../../lib/types";

function makeFact(date: string, factId = "uuid"): DailyFact {
  return {
    date,
    emoji: "🧠",
    topic: "Mind",
    fact: ".",
    whyCare: "",
    source: { kind: "paper", factId, label: "" },
  };
}

// ---------------------------------------------------------------------------
// dispatchNumber — pinned djb2 values (mirrors Swift implementation)
// ---------------------------------------------------------------------------
describe("dispatchNumber", () => {
  it("empty string → 6381 (djb2 seed 5381, no iterations; 5381 % 9000 + 1000 = 6381)", () => {
    // djb2 with no iterations: h = 5381. 5381 % 9000 = 5381. 1000 + 5381 = 6381
    expect(dispatchNumber("")).toBe(6381);
  });

  it("known UUID produces a value in [1000, 9999]", () => {
    const n = dispatchNumber("550e8400-e29b-41d4-a716-446655440000");
    expect(n).toBeGreaterThanOrEqual(1000);
    expect(n).toBeLessThanOrEqual(9999);
  });

  it("two different IDs produce different numbers (with very high probability)", () => {
    const a = dispatchNumber("550e8400-e29b-41d4-a716-446655440000");
    const b = dispatchNumber("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
    expect(a).not.toBe(b);
  });

  it("same input always produces same number", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    expect(dispatchNumber(id)).toBe(dispatchNumber(id));
  });

  it("pinned: 'abc' → specific stable value", () => {
    // djb2 of 'abc': h=5381, 'a'=97: (5381*33+97)>>>0=177670, 'b'=98: (177670*33+98)>>>0=5863208,
    // 'c'=99: (5863208*33+99)>>>0=193485963; 193485963 % 9000 = ?
    // 193485963 % 9000 = 193485963 - Math.floor(193485963/9000)*9000
    // Math.floor(193485963/9000) = 21498 (21498*9000=193482000), 193485963-193482000=3963
    // 3963 + 1000 = 4963
    expect(dispatchNumber("abc")).toBe(4963);
  });

  it("handles null/undefined gracefully — falls back to empty string result", () => {
    // The implementation does: const id = factId ?? ""
    // @ts-expect-error testing defensive null path
    expect(dispatchNumber(null)).toBe(dispatchNumber(""));
    // @ts-expect-error
    expect(dispatchNumber(undefined)).toBe(dispatchNumber(""));
  });
});

// ---------------------------------------------------------------------------
// formatDispatch
// ---------------------------------------------------------------------------
describe("formatDispatch", () => {
  it("formats as '№ NNNN'", () => {
    expect(formatDispatch("abc")).toBe(`№ ${dispatchNumber("abc")}`);
  });

  it("output always starts with '№ '", () => {
    expect(formatDispatch("test")).toMatch(/^№ \d+$/);
  });
});

// ---------------------------------------------------------------------------
// streakCount
// ---------------------------------------------------------------------------
describe("streakCount", () => {
  function todayStr(daysBack = 0): string {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  it("empty history → 0", () => {
    expect(streakCount([])).toBe(0);
  });

  it("one fact today → 1", () => {
    expect(streakCount([makeFact(todayStr(0))])).toBe(1);
  });

  it("facts on 3 consecutive days → 3", () => {
    const facts = [0, 1, 2].map((d) => makeFact(todayStr(d)));
    expect(streakCount(facts)).toBe(3);
  });

  it("capped at 7 even with many days", () => {
    const facts = Array.from({ length: 14 }, (_, i) => makeFact(todayStr(i)));
    expect(streakCount(facts)).toBe(7);
  });

  it("facts outside the 7-day window are not counted", () => {
    // 8 days ago — outside the window
    expect(streakCount([makeFact(todayStr(8))])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// formatEyebrow
// ---------------------------------------------------------------------------
describe("formatEyebrow", () => {
  it("formats a Thursday date correctly", () => {
    // 2026-07-02 is a Thursday
    expect(formatEyebrow("2026-07-02")).toBe("THU · JUL 2");
  });

  it("formats a Sunday date correctly", () => {
    // 2026-07-05 is a Sunday
    expect(formatEyebrow("2026-07-05")).toBe("SUN · JUL 5");
  });

  it("returns the raw string for invalid date", () => {
    expect(formatEyebrow("bad-date")).toBe("bad-date");
  });
});
