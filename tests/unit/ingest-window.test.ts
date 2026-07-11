import { describe, expect, test } from "vitest";
import { rollingLookbackWindow } from "@/lib/ingest-window";

describe("rollingLookbackWindow", () => {
  const now = new Date("2026-07-10T22:00:00Z");

  test("endDate is always today", () => {
    const { endDate } = rollingLookbackWindow(now, 5);
    expect(endDate).toBe("2026-07-10");
  });

  test("startDate is lookbackDays before today", () => {
    const { startDate } = rollingLookbackWindow(now, 5);
    expect(startDate).toBe("2026-07-05");
  });

  test("lookbackDays=0 returns a single-day window (today only)", () => {
    const { startDate, endDate } = rollingLookbackWindow(now, 0);
    expect(startDate).toBe(endDate);
    expect(startDate).toBe("2026-07-10");
  });

  test("larger lookbackDays produces an earlier startDate", () => {
    const short = rollingLookbackWindow(now, 3);
    const long = rollingLookbackWindow(now, 10);
    expect(new Date(long.startDate).getTime()).toBeLessThan(new Date(short.startDate).getTime());
  });

  test("crosses a month boundary correctly", () => {
    const earlyMonth = new Date("2026-08-02T00:00:00Z");
    const { startDate } = rollingLookbackWindow(earlyMonth, 5);
    expect(startDate).toBe("2026-07-28");
  });

  test("crosses a year boundary correctly", () => {
    const earlyYear = new Date("2027-01-02T00:00:00Z");
    const { startDate } = rollingLookbackWindow(earlyYear, 5);
    expect(startDate).toBe("2026-12-28");
  });
});
