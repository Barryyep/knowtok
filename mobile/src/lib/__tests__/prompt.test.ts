/**
 * Tests for prompt.ts — both exports are pure string builders (no network,
 * no RN runtime), so no mocking is needed.
 */
import { describe, it, expect } from "vitest";
import { buildWhyCarePrompt, cleanWhyCare } from "../prompt";
import type { DailyFact, Profile } from "../types";

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    name: "",
    occupation: "",
    interests: "",
    curiosityDomains: [],
    language: "en",
    ...overrides,
  };
}

function fact(overrides: Partial<DailyFact> = {}): DailyFact {
  return {
    date: "2026-07-07",
    emoji: "🤖",
    topic: "AI & Robots",
    fact: "The gist of the paper.",
    whyCare: "",
    source: { kind: "paper", factId: "1", label: "arXiv:1 · 2026-07-01", title: "A Paper Title" },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// buildWhyCarePrompt
// ---------------------------------------------------------------------------
describe("buildWhyCarePrompt", () => {
  it("writes the English system prompt when profile.language is 'en'", () => {
    const { system } = buildWhyCarePrompt(profile({ language: "en" }), fact());
    expect(system).toMatch(/Ohlo's personalized takeaways/);
  });

  it("writes the Chinese system prompt when profile.language is 'zh'", () => {
    const { system } = buildWhyCarePrompt(profile({ language: "zh" }), fact());
    expect(system).toContain("Ohlo 的个性化解读作者");
  });

  it("resolves a ReaderType id occupation to its persona prompt line", () => {
    const { user } = buildWhyCarePrompt(profile({ occupation: "student" }), fact());
    expect(user).toContain("Occupation: a student who is curious about how the world works beyond the exam syllabus");
  });

  it("passes through legacy free-text occupation unchanged", () => {
    const { user } = buildWhyCarePrompt(profile({ occupation: "marine biologist" }), fact());
    expect(user).toContain("Occupation: marine biologist");
  });

  it("resolves a ReadingStyle id interests to its persona prompt line", () => {
    const { user } = buildWhyCarePrompt(profile({ interests: "depth_thinker" }), fact());
    expect(user).toContain("Interests: prefers deeper facts with historical context or scientific reasoning to sit with alone");
  });

  it("omits the profile lines entirely and shows '(no profile)' when occupation/interests are empty", () => {
    const { user } = buildWhyCarePrompt(profile({ occupation: "", interests: "" }), fact());
    expect(user).toContain("(no profile)");
    expect(user).not.toContain("Occupation:");
    expect(user).not.toContain("Interests:");
  });

  it("includes the paper title when present", () => {
    const { user } = buildWhyCarePrompt(profile(), fact({ source: { kind: "paper", factId: "1", label: "l", title: "A Paper Title" } }));
    expect(user).toContain("Title: A Paper Title");
  });

  it("omits the title line when the source has no title", () => {
    const { user } = buildWhyCarePrompt(profile(), fact({ source: { kind: "general", factId: "1", label: "l" } }));
    expect(user).not.toContain("Title:");
  });

  it("always includes the gist and category lines", () => {
    const { user } = buildWhyCarePrompt(profile(), fact({ fact: "surprising gist", topic: "Space" }));
    expect(user).toContain("Gist: surprising gist");
    expect(user).toContain("Category: Space");
  });

  it("ends with the English instruction line for language 'en'", () => {
    const { user } = buildWhyCarePrompt(profile({ language: "en" }), fact());
    expect(user.trim().endsWith("Write the sentence (English):")).toBe(true);
  });

  it("ends with the Chinese instruction line for language 'zh'", () => {
    const { user } = buildWhyCarePrompt(profile({ language: "zh" }), fact());
    expect(user.trim().endsWith("写出那一句话(中文):")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// cleanWhyCare
// ---------------------------------------------------------------------------
describe("cleanWhyCare", () => {
  it("trims surrounding whitespace", () => {
    expect(cleanWhyCare("  hello  ")).toBe("hello");
  });

  it("leaves unquoted text unchanged", () => {
    expect(cleanWhyCare("hello")).toBe("hello");
  });

  it("strips wrapping straight double quotes", () => {
    expect(cleanWhyCare('"hello"')).toBe("hello");
  });

  it("strips wrapping straight single quotes", () => {
    expect(cleanWhyCare("'hello'")).toBe("hello");
  });

  it("strips wrapping curly quotes", () => {
    expect(cleanWhyCare("“hello”")).toBe("hello");
  });

  it("strips wrapping Chinese corner brackets", () => {
    expect(cleanWhyCare("「hello」")).toBe("hello");
  });

  it("strips a lone leading quote with no matching trailing quote", () => {
    expect(cleanWhyCare('"hello')).toBe("hello");
  });

  it("strips repeated wrapping quote characters", () => {
    expect(cleanWhyCare('""hello""')).toBe("hello");
  });

  it("only strips quotes at the edges, not quotes in the middle of the text", () => {
    expect(cleanWhyCare('he said "hi"')).toBe('he said "hi');
  });
});
