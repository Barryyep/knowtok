import { describe, expect, test, vi } from "vitest";

// personaService's network-bound functions (fetchRemotePersona,
// saveRemotePersona, savePersonaEverywhere) go untested per AGENTS.md's
// documented exception — they're thin wrappers around supabase.from(...).
// shapeDomainWeights is the one pure sub-piece worth covering directly, but
// importing the module still pulls in ./supabase and ./storage, so stub
// both the same way factService.test.ts does.
vi.mock("../supabase", () => ({
  supabase: { auth: { getUser: vi.fn() } },
}));
vi.mock("../storage", () => ({
  saveProfile: vi.fn(),
}));

import { shapeDomainWeights } from "../personaService";
describe("shapeDomainWeights", () => {
  test("passes through a valid numeric map", () => {
    expect(shapeDomainWeights({ tech_ai: 0.8, space: 0.4 })).toEqual({
      tech_ai: 0.8,
      space: 0.4,
    });
  });

  test("returns undefined for an empty object", () => {
    expect(shapeDomainWeights({})).toBeUndefined();
  });

  test("returns undefined for null/undefined", () => {
    expect(shapeDomainWeights(null)).toBeUndefined();
    expect(shapeDomainWeights(undefined)).toBeUndefined();
  });

  test("returns undefined for non-object input", () => {
    expect(shapeDomainWeights("not an object")).toBeUndefined();
    expect(shapeDomainWeights(42)).toBeUndefined();
  });

  test("drops non-numeric entries but keeps the rest", () => {
    expect(shapeDomainWeights({ tech_ai: 0.5, garbage: "nope", other: null })).toEqual({
      tech_ai: 0.5,
    });
  });

  test("returns undefined for array input (arrays pass typeof === 'object' but aren't a weights map)", () => {
    expect(shapeDomainWeights([0.5, 0.8])).toBeUndefined();
    expect(shapeDomainWeights([])).toBeUndefined();
  });
});
