/**
 * Unit tests for the swap-count helpers in storage.ts.
 *
 * nextSwapState is a pure function — no AsyncStorage needed.
 * swapsRemaining / loadSwapState / recordSwap are tested with a mocked
 * AsyncStorage, using the same pattern as storage.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock heavy RN dependencies (same pattern as storage.test.ts) ---
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    multiSet: vi.fn(),
    multiRemove: vi.fn(),
    getAllKeys: vi.fn(),
  },
}));
vi.mock("@bacons/apple-targets", () => ({
  ExtensionStorage: class {
    constructor(_group: string) {}
    set(_key: string, _val: string) {}
    remove(_key: string) {}
    static reloadWidget() {}
  },
}));
vi.mock("../watchSync", () => ({ sendFactToWatch: vi.fn() }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  nextSwapState,
  loadSwapState,
  recordSwap,
  swapsRemaining,
  MAX_DAILY_SWAPS,
  type SwapState,
} from "../storage";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// nextSwapState — pure function, no mocking needed
// ---------------------------------------------------------------------------
describe("nextSwapState — pure function", () => {
  it("returns count=1 for the given date when prev is null (first ever swap)", () => {
    expect(nextSwapState(null, "2026-07-05")).toEqual({ date: "2026-07-05", count: 1 });
  });

  it("resets count to 1 when the stored date differs (day rolled over)", () => {
    const prev: SwapState = { date: "2026-07-04", count: 3 };
    expect(nextSwapState(prev, "2026-07-05")).toEqual({ date: "2026-07-05", count: 1 });
  });

  it("increments count by 1 on a same-day swap", () => {
    const prev: SwapState = { date: "2026-07-05", count: 1 };
    expect(nextSwapState(prev, "2026-07-05")).toEqual({ date: "2026-07-05", count: 2 });
  });

  it("increments to the cap value (3) on same-day third swap", () => {
    const prev: SwapState = { date: "2026-07-05", count: 2 };
    expect(nextSwapState(prev, "2026-07-05")).toEqual({ date: "2026-07-05", count: 3 });
  });

  it("preserves the date from today, not from prev, when resetting", () => {
    const prev: SwapState = { date: "2026-01-01", count: 99 };
    const result = nextSwapState(prev, "2026-07-05");
    expect(result.date).toBe("2026-07-05");
    expect(result.count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// loadSwapState
// ---------------------------------------------------------------------------
describe("loadSwapState", () => {
  it("returns null when AsyncStorage has no entry", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);
    expect(await loadSwapState()).toBeNull();
  });

  it("returns the parsed state when a valid entry exists", async () => {
    const state: SwapState = { date: "2026-07-05", count: 2 };
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(state));
    expect(await loadSwapState()).toEqual(state);
  });

  it("returns null when the stored value is unparseable JSON", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce("{bad json");
    expect(await loadSwapState()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// swapsRemaining
// ---------------------------------------------------------------------------
describe("swapsRemaining", () => {
  it("returns MAX_DAILY_SWAPS when no state is stored", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);
    expect(await swapsRemaining("2026-07-05")).toBe(MAX_DAILY_SWAPS);
  });

  it("returns MAX_DAILY_SWAPS when the stored date is yesterday (day rolled over)", async () => {
    const state: SwapState = { date: "2026-07-04", count: 3 };
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(state));
    expect(await swapsRemaining("2026-07-05")).toBe(MAX_DAILY_SWAPS);
  });

  it("returns MAX_DAILY_SWAPS - 1 after one swap today", async () => {
    const state: SwapState = { date: "2026-07-05", count: 1 };
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(state));
    expect(await swapsRemaining("2026-07-05")).toBe(MAX_DAILY_SWAPS - 1);
  });

  it("returns 0 when today's count equals the cap", async () => {
    const state: SwapState = { date: "2026-07-05", count: MAX_DAILY_SWAPS };
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(state));
    expect(await swapsRemaining("2026-07-05")).toBe(0);
  });

  it("clamps to 0 (never negative) when count exceeds cap", async () => {
    const state: SwapState = { date: "2026-07-05", count: 99 };
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(state));
    expect(await swapsRemaining("2026-07-05")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// recordSwap
// ---------------------------------------------------------------------------
describe("recordSwap", () => {
  it("writes count=1 for today when no prior state exists", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);
    vi.mocked(AsyncStorage.setItem).mockResolvedValueOnce(undefined);

    const result = await recordSwap("2026-07-05");
    expect(result).toEqual({ date: "2026-07-05", count: 1 });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "ohlo:swapCount:v1",
      JSON.stringify({ date: "2026-07-05", count: 1 }),
    );
  });

  it("increments count on same day", async () => {
    const existing: SwapState = { date: "2026-07-05", count: 1 };
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(existing));
    vi.mocked(AsyncStorage.setItem).mockResolvedValueOnce(undefined);

    const result = await recordSwap("2026-07-05");
    expect(result).toEqual({ date: "2026-07-05", count: 2 });
  });

  it("resets to count=1 when the stored date is from yesterday", async () => {
    const stale: SwapState = { date: "2026-07-04", count: 3 };
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(stale));
    vi.mocked(AsyncStorage.setItem).mockResolvedValueOnce(undefined);

    const result = await recordSwap("2026-07-05");
    expect(result).toEqual({ date: "2026-07-05", count: 1 });
  });
});
