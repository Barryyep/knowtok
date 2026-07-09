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

import { shapeDomainWeights, buildPersonaUpsertPayload } from "../personaService";
import type { Profile } from "../types";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    name: "",
    occupation: "engineer",
    interests: "tech_ai, health",
    curiosityDomains: ["tech_ai"],
    language: "en",
    ...overrides,
  };
}
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

describe("buildPersonaUpsertPayload", () => {
  test("omits domain_weights entirely when profile.domainWeights is undefined (can't clobber the server value)", () => {
    const payload = buildPersonaUpsertPayload("user-1", profile({ domainWeights: undefined }));
    expect(payload).not.toHaveProperty("domain_weights");
  });

  test("includes domain_weights when profile.domainWeights is set", () => {
    const payload = buildPersonaUpsertPayload("user-1", profile({ domainWeights: { tech_ai: 0.8 } }));
    expect(payload.domain_weights).toEqual({ tech_ai: 0.8 });
  });

  test("includes domain_weights even when it's an empty object (explicit intent to clear, not absence)", () => {
    const payload = buildPersonaUpsertPayload("user-1", profile({ domainWeights: {} }));
    expect(payload).toHaveProperty("domain_weights", {});
  });

  test("splits comma/pinyin-comma/dunhao-separated interests into a trimmed array", () => {
    const payload = buildPersonaUpsertPayload("user-1", profile({ interests: "tech_ai, health、money" }));
    expect(payload.interests).toEqual(["tech_ai", "health", "money"]);
  });

  test("maps occupation/curiosityDomains/ageRange/language straight through", () => {
    const payload = buildPersonaUpsertPayload(
      "user-1",
      profile({ occupation: "student", curiosityDomains: ["space", "history"], ageRange: "25-34", language: "zh" }),
    );
    expect(payload.job_title).toBe("student");
    expect(payload.curiosity_tags).toEqual(["space", "history"]);
    expect(payload.age_range).toBe("25-34");
    expect(payload.language).toBe("zh");
    expect(payload.user_id).toBe("user-1");
  });

  test("blank occupation and ageRange become null, not empty string", () => {
    const payload = buildPersonaUpsertPayload("user-1", profile({ occupation: "", ageRange: undefined }));
    expect(payload.job_title).toBeNull();
    expect(payload.age_range).toBeNull();
  });
});
