/**
 * Tests for pure exports of paperService.ts.
 * fetchCandidatePapers is a thin Supabase query wrapper (network I/O) and is
 * excluded — covered by integration tests. Here: domainsToCategories
 * (taxonomy expansion), pickDailyPaper (deterministic daily selection —
 * the exact regression this file was flagged for), and paperToFact
 * (row → DailyFact transform).
 */
import { describe, it, expect, vi } from "vitest";

// paperService imports supabase.ts at module load time (createClient +
// AsyncStorage + url-polyfill); stub it out since none of the tested
// exports touch it.
vi.mock("../supabase", () => ({ supabase: {} }));

import { domainsToCategories, pickDailyPaper, paperToFact, type CandidatePaper } from "../paperService";

// ---------------------------------------------------------------------------
// domainsToCategories
// ---------------------------------------------------------------------------
describe("domainsToCategories", () => {
  it("expands a domain id to itself plus its legacy categories", () => {
    expect(domainsToCategories(["tech_ai"])).toEqual(["tech_ai", "AI & Robots"]);
  });

  it("a domain with no legacy categories maps to just itself", () => {
    expect(domainsToCategories(["space"])).toEqual(["space"]);
  });

  it("passes through unknown tokens unchanged (legacy human_category values)", () => {
    expect(domainsToCategories(["Climate"])).toEqual(["Climate"]);
  });

  it("dedupes repeated input", () => {
    expect(domainsToCategories(["tech_ai", "tech_ai"])).toEqual(["tech_ai", "AI & Robots"]);
  });

  it("combines multiple domains into one flat unique list", () => {
    const result = domainsToCategories(["tech_ai", "health"]);
    expect(result).toEqual(["tech_ai", "AI & Robots", "health", "Your Health"]);
  });

  it("empty input returns empty array", () => {
    expect(domainsToCategories([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// pickDailyPaper — stable-for-(user,date) selection
// ---------------------------------------------------------------------------
function paper(id: string, overrides: Partial<CandidatePaper> = {}): CandidatePaper {
  return {
    id,
    source: "arxiv",
    arxiv_id_base: `2507.0000${id}`,
    title: `Paper ${id}`,
    hook_summary_en: `hook ${id}`,
    hook_summary_zh: null,
    plain_summary_en: null,
    plain_summary_zh: null,
    human_category: "tech_ai",
    published_at: "2026-07-01",
    abs_url: `https://arxiv.org/abs/${id}`,
    metadata: null,
    ...overrides,
  };
}

describe("pickDailyPaper", () => {
  it("returns null for an empty candidate list", () => {
    expect(pickDailyPaper([], "user1", "2026-07-07", [])).toBeNull();
  });

  it("is deterministic: same (userId, dateStr) always picks the same paper", () => {
    const papers = [paper("a"), paper("b"), paper("c")];
    const first = pickDailyPaper(papers, "user1", "2026-07-07", []);
    const second = pickDailyPaper(papers, "user1", "2026-07-07", []);
    expect(first).toBe(second);
  });

  it("regression: known hash(user1:2026-07-07) % 3 === 1 selects index 1", () => {
    const papers = [paper("a"), paper("b"), paper("c")];
    expect(pickDailyPaper(papers, "user1", "2026-07-07", [])?.id).toBe("b");
  });

  it("regression: known hash(userA:2026-01-01) % 3 === 0 selects index 0", () => {
    const papers = [paper("a"), paper("b"), paper("c")];
    expect(pickDailyPaper(papers, "userA", "2026-01-01", [])?.id).toBe("a");
  });

  it("different dates for the same user can select different papers", () => {
    const papers = [paper("a"), paper("b"), paper("c")];
    const day1 = pickDailyPaper(papers, "user1", "2026-07-07", []);
    const day2 = pickDailyPaper(papers, "userA", "2026-01-01", []);
    expect(day1?.id).not.toBe(day2?.id);
  });

  it("never returns an excluded id when non-excluded candidates remain", () => {
    const papers = [paper("a"), paper("b"), paper("c")];
    for (const [userId, dateStr] of [
      ["u1", "2026-01-01"],
      ["u2", "2026-01-02"],
      ["u3", "2026-01-03"],
      ["u4", "2026-01-04"],
      ["u5", "2026-01-05"],
    ]) {
      const result = pickDailyPaper(papers, userId, dateStr, ["a"]);
      expect(result?.id).not.toBe("a");
    }
  });

  it("falls back to the full paper list when every candidate is excluded", () => {
    const papers = [paper("a"), paper("b")];
    const result = pickDailyPaper(papers, "user1", "2026-07-07", ["a", "b"]);
    expect(result).not.toBeNull();
    expect(["a", "b"]).toContain(result?.id);
  });
});

// ---------------------------------------------------------------------------
// paperToFact — row → DailyFact transform
// ---------------------------------------------------------------------------
describe("paperToFact", () => {
  it("uses hook_summary_en for English", () => {
    const p = paper("a", { hook_summary_en: "the hook" });
    const fact = paperToFact(p, "en", "2026-07-07");
    expect(fact.fact).toBe("the hook");
  });

  it("uses hook_summary_zh for Chinese", () => {
    const p = paper("a", { hook_summary_zh: "中文钩子" });
    const fact = paperToFact(p, "zh", "2026-07-07");
    expect(fact.fact).toBe("中文钩子");
  });

  it("falls back to plain_summary when hook is missing", () => {
    const p = paper("a", { hook_summary_en: "", plain_summary_en: "the plain summary" });
    const fact = paperToFact(p, "en", "2026-07-07");
    expect(fact.fact).toBe("the plain summary");
  });

  it("falls back to the title when hook and summary are both missing", () => {
    const p = paper("a", { hook_summary_en: "", plain_summary_en: null, title: "The Title" });
    const fact = paperToFact(p, "en", "2026-07-07");
    expect(fact.fact).toBe("The Title");
  });

  it("trims whitespace from the hook", () => {
    const p = paper("a", { hook_summary_en: "  padded hook  " });
    expect(paperToFact(p, "en", "2026-07-07").fact).toBe("padded hook");
  });

  it("arXiv paper: source label is 'arXiv:<id> · <published date>' and arxivId is set", () => {
    const p = paper("a", { source: "arxiv", arxiv_id_base: "2507.12345", published_at: "2026-07-01T10:00:00Z" });
    const fact = paperToFact(p, "en", "2026-07-07");
    expect(fact.source.label).toBe("arXiv:2507.12345 · 2026-07-01");
    expect(fact.source.arxivId).toBe("2507.12345");
  });

  it("null source is treated as arXiv (legacy rows)", () => {
    const p = paper("a", { source: null, arxiv_id_base: "2507.12345" });
    const fact = paperToFact(p, "en", "2026-07-07");
    expect(fact.source.arxivId).toBe("2507.12345");
  });

  it("OpenAlex paper: source label uses the venue and omits arxivId", () => {
    const p = paper("a", {
      source: "openalex",
      metadata: { venue: "Nature" },
      published_at: "2026-07-01T10:00:00Z",
    });
    const fact = paperToFact(p, "en", "2026-07-07");
    expect(fact.source.label).toBe("Nature · 2026-07-01");
    expect(fact.source.arxivId).toBeUndefined();
  });

  it("OpenAlex paper without a venue falls back to the literal 'OpenAlex' label", () => {
    const p = paper("a", { source: "openalex", metadata: null, published_at: "2026-07-01T10:00:00Z" });
    const fact = paperToFact(p, "en", "2026-07-07");
    expect(fact.source.label).toBe("OpenAlex · 2026-07-01");
  });

  it("carries the requested dateStr, not the paper's published date, in fact.date", () => {
    const p = paper("a", { published_at: "2026-01-01" });
    const fact = paperToFact(p, "en", "2026-07-07");
    expect(fact.date).toBe("2026-07-07");
  });

  it("whyCare starts empty (filled in async later)", () => {
    expect(paperToFact(paper("a"), "en", "2026-07-07").whyCare).toBe("");
  });

  it("source.factId and source.paperId both equal the paper id", () => {
    const fact = paperToFact(paper("xyz"), "en", "2026-07-07");
    expect(fact.source.factId).toBe("xyz");
    expect(fact.source.paperId).toBe("xyz");
  });

  it("derives emoji/topic from the known human_category taxonomy", () => {
    const p = paper("a", { human_category: "AI & Robots" });
    const fact = paperToFact(p, "en", "2026-07-07");
    expect(fact.emoji).toBe("🤖");
    expect(fact.topic).toBe("AI & Robots");
  });
});
