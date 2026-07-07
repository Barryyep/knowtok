import { describe, expect, test } from "vitest";
import { computeDailySince } from "@/lib/ingest";

describe("computeDailySince", () => {
  const now = new Date("2026-07-06T10:00:00Z");
  const lookbackDays = 7;

  test("returns newestInDb when the domain already has papers", () => {
    const newestInDb = new Date("2026-07-02T17:59:59Z");
    const result = computeDailySince(newestInDb, now, lookbackDays);
    expect(result).toEqual(newestInDb);
  });

  test("falls back to rolling lookback window when domain has no papers", () => {
    const result = computeDailySince(undefined, now, lookbackDays);
    const expected = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    expect(result).toEqual(expected);
  });

  test("respects the lookbackDays parameter in fallback", () => {
    const result3 = computeDailySince(undefined, now, 3);
    const result14 = computeDailySince(undefined, now, 14);
    expect(result3.getTime()).toBeGreaterThan(result14.getTime());
    expect(now.getTime() - result3.getTime()).toBe(3 * 24 * 60 * 60 * 1000);
  });

  test("newestInDb takes precedence even if older than the lookback window", () => {
    // e.g. domain hasn't been updated in 30 days — we still use that anchor
    const oldNewest = new Date("2026-06-01T00:00:00Z");
    const result = computeDailySince(oldNewest, now, lookbackDays);
    expect(result).toEqual(oldNewest);
  });
});
