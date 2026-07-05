import { describe, it, expect } from "vitest";
import {
  occupationForPrompt,
  interestsForPrompt,
  isReadingStyleId,
  readerTypeLabel,
  readingStyleLabel,
  readerTypeById,
  readingStyleById,
} from "../onboarding";

// ---------------------------------------------------------------------------
// occupationForPrompt
// ---------------------------------------------------------------------------
describe("occupationForPrompt", () => {
  it("known reader-type id returns the prompt string", () => {
    const result = occupationForPrompt("professional");
    expect(result).toContain("working professional");
  });

  it("student id returns its prompt", () => {
    expect(occupationForPrompt("student")).toContain("student");
  });

  it("homemaker id returns its prompt", () => {
    expect(occupationForPrompt("homemaker")).toContain("household");
  });

  it("other id returns its prompt", () => {
    const result = occupationForPrompt("other");
    expect(result).toBeTruthy();
    expect(result).not.toBe("other");
  });

  it("legacy free text passes through unchanged", () => {
    expect(occupationForPrompt("Senior engineer at ACME")).toBe("Senior engineer at ACME");
  });

  it("empty string passes through", () => {
    expect(occupationForPrompt("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// interestsForPrompt
// ---------------------------------------------------------------------------
describe("interestsForPrompt", () => {
  it("social_currency id returns its prompt", () => {
    const result = interestsForPrompt("social_currency");
    expect(result).toContain("dinner");
  });

  it("depth_thinker id returns its prompt", () => {
    const result = interestsForPrompt("depth_thinker");
    expect(result).toContain("deeper");
  });

  it("legacy comma-separated interests pass through", () => {
    const legacy = "cooking, hiking, technology";
    expect(interestsForPrompt(legacy)).toBe(legacy);
  });
});

// ---------------------------------------------------------------------------
// isReadingStyleId
// ---------------------------------------------------------------------------
describe("isReadingStyleId", () => {
  it("returns true for social_currency", () => {
    expect(isReadingStyleId("social_currency")).toBe(true);
  });

  it("returns true for depth_thinker", () => {
    expect(isReadingStyleId("depth_thinker")).toBe(true);
  });

  it("returns false for legacy free text", () => {
    expect(isReadingStyleId("likes cooking and tech")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isReadingStyleId("")).toBe(false);
  });

  it("returns false for a reader-type id", () => {
    // Reader types are not reading styles
    expect(isReadingStyleId("professional")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// readerTypeLabel
// ---------------------------------------------------------------------------
describe("readerTypeLabel", () => {
  it("professional: returns zh label in zh mode", () => {
    const label = readerTypeLabel("professional", "zh");
    expect(label).toBe("在职场里穿行的人");
  });

  it("professional: returns en label in en mode", () => {
    const label = readerTypeLabel("professional", "en");
    expect(label).toBe("Moving through workplaces");
  });

  it("homemaker label differs from professional", () => {
    expect(readerTypeLabel("homemaker", "en")).not.toBe(readerTypeLabel("professional", "en"));
  });

  it("unknown occupation returns the raw string", () => {
    expect(readerTypeLabel("free text occupation", "en")).toBe("free text occupation");
  });
});

// ---------------------------------------------------------------------------
// readingStyleLabel
// ---------------------------------------------------------------------------
describe("readingStyleLabel", () => {
  it("social_currency: returns zh label in zh mode", () => {
    expect(readingStyleLabel("social_currency", "zh")).toBe("社交弹药型");
  });

  it("depth_thinker: returns en label in en mode", () => {
    expect(readingStyleLabel("depth_thinker", "en")).toBe("For sitting with alone");
  });

  it("legacy interests pass through unchanged", () => {
    const legacy = "history, science";
    expect(readingStyleLabel(legacy, "en")).toBe(legacy);
  });
});

// ---------------------------------------------------------------------------
// Structural invariants
// ---------------------------------------------------------------------------
describe("onboarding data invariants", () => {
  it("all reader types have non-empty prompt, label, zh, en", () => {
    for (const id of ["professional", "student", "homemaker", "other"]) {
      const rt = readerTypeById(id)!;
      expect(rt.prompt.length).toBeGreaterThan(0);
      expect(rt.labelZh.length).toBeGreaterThan(0);
      expect(rt.labelEn.length).toBeGreaterThan(0);
    }
  });

  it("all reading styles have non-empty prompt and labels", () => {
    for (const id of ["social_currency", "depth_thinker"]) {
      const rs = readingStyleById(id)!;
      expect(rs.prompt.length).toBeGreaterThan(0);
      expect(rs.labelZh.length).toBeGreaterThan(0);
      expect(rs.labelEn.length).toBeGreaterThan(0);
    }
  });
});
