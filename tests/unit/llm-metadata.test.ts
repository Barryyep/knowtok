import { describe, expect, test } from "vitest";
import { categoryFromPrefix, buildFallbackMetadata } from "@/lib/llm";

describe("categoryFromPrefix", () => {
  test("maps cs.* to AI & Robots", () => {
    expect(categoryFromPrefix("cs.AI")).toBe("AI & Robots");
    expect(categoryFromPrefix("cs.LG")).toBe("AI & Robots");
    expect(categoryFromPrefix("cs.CV")).toBe("AI & Robots");
  });

  test("maps q-bio.* to Your Health", () => {
    expect(categoryFromPrefix("q-bio.BM")).toBe("Your Health");
    expect(categoryFromPrefix("q-bio.GN")).toBe("Your Health");
  });

  test("maps q-fin.* to Your Money", () => {
    expect(categoryFromPrefix("q-fin.CP")).toBe("Your Money");
    expect(categoryFromPrefix("q-fin.ST")).toBe("Your Money");
  });

  test("maps econ.* to Your Money", () => {
    expect(categoryFromPrefix("econ.GN")).toBe("Your Money");
    expect(categoryFromPrefix("econ.EM")).toBe("Your Money");
  });

  test("maps physics.ao-ph to Climate", () => {
    expect(categoryFromPrefix("physics.ao-ph")).toBe("Climate");
  });

  test("maps physics.geo-ph to Climate", () => {
    expect(categoryFromPrefix("physics.geo-ph")).toBe("Climate");
  });

  test("maps astro-ph.EP to Climate", () => {
    expect(categoryFromPrefix("astro-ph.EP")).toBe("Climate");
  });

  test("defaults unknown to AI & Robots", () => {
    expect(categoryFromPrefix("math.AG")).toBe("AI & Robots");
    expect(categoryFromPrefix("hep-th")).toBe("AI & Robots");
    expect(categoryFromPrefix("unknown")).toBe("AI & Robots");
  });
});

describe("buildFallbackMetadata", () => {
  test("returns all 4 fields with sensible defaults", () => {
    const paper = {
      title: "Test Paper",
      abstract:
        "This is a test abstract about machine learning. It describes a new approach. The results are promising.",
      categories: ["cs.AI", "cs.LG"],
      primaryCategory: "cs.AI",
    };
    const result = buildFallbackMetadata(paper);
    expect(result.hook).toBeTruthy();
    expect(result.tags.length).toBeGreaterThan(0);
    expect(result.humanCategory).toBe("AI & Robots");
    expect(result.plainSummary).toBeTruthy();
  });

  test("handles empty abstract gracefully", () => {
    const paper = {
      title: "Empty Abstract Paper",
      abstract: "",
      categories: ["cs.AI"],
      primaryCategory: "cs.AI",
    };
    const result = buildFallbackMetadata(paper);
    expect(result.hook).toBeTruthy();
    expect(result.tags.length).toBeGreaterThan(0);
    expect(result.humanCategory).toBe("AI & Robots");
    expect(result.plainSummary).toBeDefined();
  });

  test("uses correct category from primaryCategory prefix", () => {
    const paper = {
      title: "Bio Paper",
      abstract: "A study of genomic markers.",
      categories: ["q-bio.GN"],
      primaryCategory: "q-bio.GN",
    };
    const result = buildFallbackMetadata(paper);
    expect(result.humanCategory).toBe("Your Health");
  });

  test("uses correct category for q-fin prefix", () => {
    const paper = {
      title: "Finance Paper",
      abstract: "Portfolio optimization using neural networks.",
      categories: ["q-fin.CP"],
      primaryCategory: "q-fin.CP",
    };
    const result = buildFallbackMetadata(paper);
    expect(result.humanCategory).toBe("Your Money");
  });

  test("uses correct category for climate-related prefix", () => {
    const paper = {
      title: "Climate Paper",
      abstract: "Atmospheric measurements over the past decade.",
      categories: ["physics.ao-ph"],
      primaryCategory: "physics.ao-ph",
    };
    const result = buildFallbackMetadata(paper);
    expect(result.humanCategory).toBe("Climate");
  });

  test("plainSummary extracts first 3 sentences from abstract", () => {
    const paper = {
      title: "Multi Sentence",
      abstract:
        "First sentence. Second sentence. Third sentence. Fourth sentence.",
      categories: ["cs.AI"],
      primaryCategory: "cs.AI",
    };
    const result = buildFallbackMetadata(paper);
    expect(result.plainSummary).toContain("First sentence");
    expect(result.plainSummary).toContain("Second sentence");
    expect(result.plainSummary).toContain("Third sentence");
    expect(result.plainSummary).not.toContain("Fourth sentence");
  });

  test("plainSummary handles abstract with fewer than 3 sentences", () => {
    const paper = {
      title: "Short Abstract",
      abstract: "Short abstract.",
      categories: ["cs.AI"],
      primaryCategory: "cs.AI",
    };
    const result = buildFallbackMetadata(paper);
    expect(result.plainSummary).toContain("Short abstract");
  });

  test("generates fallback tags from categories", () => {
    const paper = {
      title: "Tagged Paper",
      abstract: "An abstract about something.",
      categories: ["cs.AI", "cs.LG", "stat.ML"],
      primaryCategory: "cs.AI",
    };
    const result = buildFallbackMetadata(paper);
    expect(result.tags.length).toBeGreaterThan(0);
    expect(result.tags.length).toBeLessThanOrEqual(5);
  });

  test("uses fallback tags when categories produce nothing useful", () => {
    const paper = {
      title: "No Category Tags",
      abstract: "An abstract.",
      categories: [],
      primaryCategory: "cs.AI",
    };
    const result = buildFallbackMetadata(paper);
    expect(result.tags).toEqual(["research", "arxiv"]);
  });

  test("truncates hook from long abstracts to ~28 words", () => {
    const words = Array.from({ length: 50 }, (_, i) => `word${i}`);
    const paper = {
      title: "Long Abstract",
      abstract: words.join(" "),
      categories: ["cs.AI"],
      primaryCategory: "cs.AI",
    };
    const result = buildFallbackMetadata(paper);
    const hookWords = result.hook.split(" ").filter(Boolean);
    expect(hookWords.length).toBeLessThanOrEqual(29); // 28 words + trailing "."
  });
});
