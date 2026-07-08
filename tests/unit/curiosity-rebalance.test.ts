import { describe, expect, test } from "vitest";
import {
  computeRebalancedWeights,
  isEligiblePersona,
  tallyEventsByUserAndDomain,
  REBALANCE_STEP,
  WEIGHT_FLOOR,
  WEIGHT_CEILING,
  type RebalanceEventRow,
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

describe("isEligiblePersona", () => {
  test("a persona with a non-empty domain_weights map is eligible", () => {
    expect(isEligiblePersona({ user_id: "u1", domain_weights: { tech_ai: 0.5 } })).toBe(true);
  });

  test("a persona with an empty domain_weights map ({}) is not eligible", () => {
    expect(isEligiblePersona({ user_id: "u1", domain_weights: {} })).toBe(false);
  });

  test("a persona with null domain_weights is not eligible", () => {
    expect(isEligiblePersona({ user_id: "u1", domain_weights: null })).toBe(false);
  });
});

describe("tallyEventsByUserAndDomain", () => {
  const VALID = new Set(["tech_ai", "space"]);

  function event(overrides: Partial<RebalanceEventRow> = {}): RebalanceEventRow {
    return {
      user_id: "u1",
      event_type: "swap",
      metadata: { domain: "tech_ai" },
      ...overrides,
    };
  }

  test("counts a swap event against the right user and domain", () => {
    const result = tallyEventsByUserAndDomain([event()], VALID);
    expect(result.get("u1")).toEqual({ tech_ai: { swap: 1, share: 0, sourceTap: 0 } });
  });

  test("counts share and source_tap event types", () => {
    const result = tallyEventsByUserAndDomain(
      [event({ event_type: "share" }), event({ event_type: "source_tap" })],
      VALID,
    );
    expect(result.get("u1")).toEqual({ tech_ai: { swap: 0, share: 1, sourceTap: 1 } });
  });

  test("accumulates multiple events of the same type for the same domain", () => {
    const result = tallyEventsByUserAndDomain(
      [event(), event(), event({ event_type: "share" })],
      VALID,
    );
    expect(result.get("u1")).toEqual({ tech_ai: { swap: 2, share: 1, sourceTap: 0 } });
  });

  test("splits tallies across users", () => {
    const result = tallyEventsByUserAndDomain(
      [event({ user_id: "u1" }), event({ user_id: "u2", event_type: "share" })],
      VALID,
    );
    expect(result.get("u1")).toEqual({ tech_ai: { swap: 1, share: 0, sourceTap: 0 } });
    expect(result.get("u2")).toEqual({ tech_ai: { swap: 0, share: 1, sourceTap: 0 } });
  });

  test("splits tallies across domains for the same user", () => {
    const result = tallyEventsByUserAndDomain(
      [event({ metadata: { domain: "tech_ai" } }), event({ metadata: { domain: "space" } })],
      VALID,
    );
    expect(result.get("u1")).toEqual({
      tech_ai: { swap: 1, share: 0, sourceTap: 0 },
      space: { swap: 1, share: 0, sourceTap: 0 },
    });
  });

  test("ignores an event with a missing domain (legacy/general-track fact) without crashing", () => {
    const result = tallyEventsByUserAndDomain([event({ metadata: {} })], VALID);
    expect(result.size).toBe(0);
  });

  test("ignores an event with null metadata without crashing", () => {
    const result = tallyEventsByUserAndDomain([event({ metadata: null })], VALID);
    expect(result.size).toBe(0);
  });

  test("ignores an event whose domain is not in the valid set (stale/renamed taxonomy id)", () => {
    const result = tallyEventsByUserAndDomain([event({ metadata: { domain: "retired_domain" } })], VALID);
    expect(result.size).toBe(0);
  });

  test("empty events array yields an empty map", () => {
    expect(tallyEventsByUserAndDomain([], VALID).size).toBe(0);
  });
});
