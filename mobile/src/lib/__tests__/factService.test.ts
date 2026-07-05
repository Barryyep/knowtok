/**
 * Tests for pure exports of factService.ts.
 * The async service functions (getTodayFact, generateWhyCare…) require Supabase
 * + goodvision and are covered by integration tests; tested separately.
 * Here we only test isoWeekKey (pure date math, regression-prone).
 *
 * All heavy module dependencies are stubbed with vi.mock so the module
 * initialises cleanly in a Node environment with no network or RN runtime.
 */
import { describe, it, expect, vi } from "vitest";

// --- Stub out every impure dependency of factService.ts ---
vi.mock("../config", () => ({ ENV_API_KEY: "" }));
vi.mock("../generalFactService", () => ({ generateGeneralFact: vi.fn() }));
vi.mock("../goodvision", () => ({ generateText: vi.fn() }));
vi.mock("../paperService", () => ({
  fetchCandidatePapers: vi.fn(),
  paperToFact: vi.fn(),
  domainsToCategories: vi.fn(),
}));
vi.mock("../ranking", () => ({ rankCandidates: vi.fn() }));
vi.mock("../personaTrack", () => ({ getPersonaTrack: vi.fn() }));
vi.mock("../prompt", () => ({
  buildWhyCarePrompt: vi.fn(),
  cleanWhyCare: vi.fn(),
}));
vi.mock("../storage", () => ({
  loadFactHistory: vi.fn(),
  loadStoredFact: vi.fn(),
  saveFact: vi.fn(),
  updateStoredWhyCare: vi.fn(),
}));
vi.mock("../supabase", () => ({
  supabase: { auth: { getUser: vi.fn() } },
}));

import { isoWeekKey } from "../factService";

// ---------------------------------------------------------------------------
// isoWeekKey — ISO 8601 week number regression suite
// ---------------------------------------------------------------------------
describe("isoWeekKey", () => {
  it("2021-01-05 → 2021W01 (regression: old noon-bias returned W02)", () => {
    // Jan 5 2021 is Tuesday. Thursday of that week = Jan 7. Week 1 of 2021.
    expect(isoWeekKey("2021-01-05")).toBe("2021W01");
  });

  it("2026-07-05 → 2026W27", () => {
    // July 5 2026 is Sunday. Thursday = July 2. Day 183 of year. ceil(183/7)=27.
    expect(isoWeekKey("2026-07-05")).toBe("2026W27");
  });

  it("2027-01-08 → 2027W01 (regression: old noon-bias returned W02)", () => {
    // Jan 8 2027 is Friday. Thursday = Jan 7. Day 6 of 2027. ceil(7/7)=1.
    expect(isoWeekKey("2027-01-08")).toBe("2027W01");
  });

  it("2026-12-31 → 2026W53", () => {
    // Dec 31 2026 is Thursday. Day 364 of 2026. ceil(365/7)=53.
    expect(isoWeekKey("2026-12-31")).toBe("2026W53");
  });

  it("2025-12-29 → 2026W01 (ISO week belongs to next year)", () => {
    // Dec 29 2025 is Monday. Thursday = Jan 1 2026. Year 2026, day 0. ceil(1/7)=1.
    expect(isoWeekKey("2025-12-29")).toBe("2026W01");
  });

  it("returns a string matching YYYYWNN format", () => {
    const result = isoWeekKey("2026-03-15");
    expect(result).toMatch(/^\d{4}W\d{2}$/);
  });

  it("week number is padded to 2 digits", () => {
    // Week 1 should be W01, not W1
    expect(isoWeekKey("2026-01-01")).toMatch(/W\d{2}$/);
    const [, week] = isoWeekKey("2026-01-01").split("W");
    expect(week).toHaveLength(2);
  });

  it("same date always returns same key (determinism)", () => {
    expect(isoWeekKey("2026-06-15")).toBe(isoWeekKey("2026-06-15"));
  });
});
