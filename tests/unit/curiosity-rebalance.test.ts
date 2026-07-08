import { describe, expect, test } from "vitest";
import {
  computeRebalancedWeights,
  REBALANCE_STEP,
  WEIGHT_FLOOR,
  WEIGHT_CEILING,
} from "@/lib/curiosity-rebalance";

describe("computeRebalancedWeights", () => {
  test("swap-only activity nudges the domain weight down", () => {
    const result = computeRebalancedWeights(
      { tech_ai: 0.5 },
      { tech_ai: { swap: 1, share: 0, sourceTap: 0 } },
    );
    expect(result.tech_ai).toBeCloseTo(0.5 - REBALANCE_STEP, 5);
  });

  test("share activity nudges the domain weight up", () => {
    const result = computeRebalancedWeights(
      { space: 0.5 },
      { space: { swap: 0, share: 1, sourceTap: 0 } },
    );
    expect(result.space).toBeCloseTo(0.5 + REBALANCE_STEP * 3, 5);
  });

  test("source_tap activity nudges the domain weight up moderately", () => {
    const result = computeRebalancedWeights(
      { health: 0.5 },
      { health: { swap: 0, share: 0, sourceTap: 1 } },
    );
    expect(result.health).toBeCloseTo(0.5 + REBALANCE_STEP * 1, 5);
  });

  test("domains with zero events in the window are left unchanged", () => {
    const result = computeRebalancedWeights(
      { tech_ai: 0.4, climate: 0.6 },
      { tech_ai: { swap: 1, share: 0, sourceTap: 0 } },
    );
    expect(result.climate).toBe(0.6);
  });

  test("clamps at the floor instead of hitting zero", () => {
    const result = computeRebalancedWeights(
      { tech_ai: 0.06 },
      { tech_ai: { swap: 10, share: 0, sourceTap: 0 } },
    );
    expect(result.tech_ai).toBe(WEIGHT_FLOOR);
  });

  test("clamps at the ceiling", () => {
    const result = computeRebalancedWeights(
      { space: 0.98 },
      { space: { swap: 0, share: 10, sourceTap: 0 } },
    );
    expect(result.space).toBe(WEIGHT_CEILING);
  });

  test("mixed signals net out via the combined delta", () => {
    // 2 shares (+6) + 1 source_tap (+1) + 3 swaps (-3) = net +4 delta
    const result = computeRebalancedWeights(
      { mind: 0.5 },
      { mind: { swap: 3, share: 2, sourceTap: 1 } },
    );
    expect(result.mind).toBeCloseTo(0.5 + REBALANCE_STEP * 4, 5);
  });

  test("is deterministic for the same inputs", () => {
    const current = { tech_ai: 0.5, space: 0.3 };
    const tallies = { tech_ai: { swap: 1, share: 2, sourceTap: 1 } };
    const a = computeRebalancedWeights(current, tallies);
    const b = computeRebalancedWeights(current, tallies);
    expect(a).toEqual(b);
  });

  test("does not mutate the input weights object", () => {
    const current = { tech_ai: 0.5 };
    computeRebalancedWeights(current, { tech_ai: { swap: 0, share: 1, sourceTap: 0 } });
    expect(current.tech_ai).toBe(0.5);
  });

  test("ignores domains not present in currentWeights", () => {
    const result = computeRebalancedWeights(
      { tech_ai: 0.5 },
      { history: { swap: 0, share: 5, sourceTap: 0 } },
    );
    expect(result).toEqual({ tech_ai: 0.5 });
  });
});
