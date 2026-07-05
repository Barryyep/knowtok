import { describe, it, expect } from "vitest";
import { needScore, haveScore, rankCandidates } from "../ranking";
import type { RelevanceMetadata } from "../ranking";
import type { CandidatePaper } from "../paperService";
import type { Profile } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRelevance(overrides: Partial<RelevanceMetadata> = {}): RelevanceMetadata {
  return {
    contexts: [],
    utility: "conversation",
    timeliness: "evergreen",
    hook_strength: 0.5,
    structure: 0.5,
    ...overrides,
  };
}

const BASE_PROFILE: Profile = {
  name: "",
  occupation: "",
  interests: "",
  curiosityDomains: [],
  language: "en",
};

function makePaper(overrides: Partial<CandidatePaper> = {}): CandidatePaper {
  return {
    id: "paper-1",
    source: "arxiv",
    arxiv_id_base: "",
    title: "Test",
    hook_summary_en: "Hook",
    hook_summary_zh: null,
    plain_summary_en: null,
    plain_summary_zh: null,
    human_category: "tech_ai",
    published_at: "2026-01-01",
    abs_url: "",
    metadata: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// needScore
// ---------------------------------------------------------------------------
describe("needScore", () => {
  it("null relevance → 0.7 neutral", () => {
    expect(needScore(null, BASE_PROFILE)).toBe(0.7);
  });

  it("undefined relevance → 0.7 neutral", () => {
    expect(needScore(undefined, BASE_PROFILE)).toBe(0.7);
  });

  it("base score without any matches is 0.4", () => {
    // Use "breaking" timeliness — the else branch only matches "evergreen",
    // so breaking gets 0 timeliness credit. No context/utility match either.
    const rel = makeRelevance({ contexts: [], utility: "conversation", timeliness: "breaking" });
    // 0.4 + 0*0.3 + 0*0.2 + 0*0.1 = 0.4
    expect(needScore(rel, BASE_PROFILE)).toBe(0.4);
  });

  it("context match adds 0.3 (use non-evergreen timeliness to isolate)", () => {
    // timeliness "breaking" won't match the else-branch (evergreen), so
    // the only contribution is the context match.
    const rel = makeRelevance({ contexts: ["professional"], timeliness: "breaking" });
    const profile = { ...BASE_PROFILE, occupation: "professional" };
    // professional occ → else-if: timeliness "breaking" != "recent" → 0
    // 0.4 + 0.3 + 0 + 0 = 0.7
    expect(needScore(rel, profile)).toBeCloseTo(0.7); // 0.4 + 0.3
  });

  it("homemaker ↔ parent context mapping", () => {
    // timeliness "breaking" → else branch: "breaking" != "evergreen" → 0
    const rel = makeRelevance({ contexts: ["parent"], timeliness: "breaking" });
    const profile = { ...BASE_PROFILE, occupation: "homemaker" };
    expect(needScore(rel, profile)).toBeCloseTo(0.7); // 0.4 + 0.3
  });

  it("social_currency interest ↔ conversation utility adds 0.2", () => {
    // timeliness "recent" → else branch: "recent" != "evergreen" → 0 (no readingMoment, no pro occ)
    const rel = makeRelevance({ utility: "conversation", timeliness: "recent" });
    const profile = { ...BASE_PROFILE, interests: "social_currency" };
    expect(needScore(rel, profile)).toBeCloseTo(0.6); // 0.4 + 0.2
  });

  it("depth_thinker interest ↔ decision utility adds 0.2", () => {
    const rel = makeRelevance({ utility: "decision", timeliness: "recent" });
    const profile = { ...BASE_PROFILE, interests: "depth_thinker" };
    expect(needScore(rel, profile)).toBeCloseTo(0.6);
  });

  it("depth_thinker interest ↔ self utility adds 0.2", () => {
    const rel = makeRelevance({ utility: "self", timeliness: "recent" });
    const profile = { ...BASE_PROFILE, interests: "depth_thinker" };
    expect(needScore(rel, profile)).toBeCloseTo(0.6);
  });

  it("cracks readingMoment ↔ recent timeliness adds 0.1", () => {
    const rel = makeRelevance({ timeliness: "recent" });
    const profile = { ...BASE_PROFILE, readingMoment: "cracks" };
    expect(needScore(rel, profile)).toBeCloseTo(0.5);
  });

  it("professional occupation ↔ recent timeliness adds 0.1", () => {
    const rel = makeRelevance({ timeliness: "recent" });
    const profile = { ...BASE_PROFILE, occupation: "professional" };
    expect(needScore(rel, profile)).toBeCloseTo(0.5);
  });

  it("non-cracks non-professional ↔ evergreen timeliness adds 0.1", () => {
    const rel = makeRelevance({ timeliness: "evergreen" });
    const profile = { ...BASE_PROFILE, occupation: "student" };
    expect(needScore(rel, profile)).toBeCloseTo(0.5);
  });

  it("all three terms match → 1.0", () => {
    // professional occ → else-if branch: timeliness "recent" = match (0.1)
    const rel = makeRelevance({
      contexts: ["professional"],
      utility: "conversation",
      timeliness: "recent",
    });
    const profile = {
      ...BASE_PROFILE,
      occupation: "professional",
      interests: "social_currency",
    };
    // 0.4 + 0.3 + 0.2 + 0.1 = 1.0
    expect(needScore(rel, profile)).toBeCloseTo(1.0);
  });
});

// ---------------------------------------------------------------------------
// haveScore
// ---------------------------------------------------------------------------
describe("haveScore", () => {
  it("null relevance → 0.7 neutral", () => {
    expect(haveScore(null, "arxiv")).toBe(0.7);
  });

  it("undefined relevance → 0.7 neutral", () => {
    expect(haveScore(undefined, "arxiv")).toBe(0.7);
  });

  it("arxiv source_tier = 1.0", () => {
    const rel = makeRelevance({ hook_strength: 0, structure: 0, timeliness: "evergreen" });
    // 0.35*1.0 + 0.35*0 + 0.20*0.7 + 0.10*0 = 0.35 + 0.14 = 0.49
    expect(haveScore(rel, "arxiv")).toBeCloseTo(0.49);
  });

  it("openalex source_tier = 1.0 (same as arxiv)", () => {
    const rel = makeRelevance({ hook_strength: 0, structure: 0, timeliness: "evergreen" });
    expect(haveScore(rel, "openalex")).toBeCloseTo(0.49);
  });

  it("owid source_tier = 0.9", () => {
    const rel = makeRelevance({ hook_strength: 0, structure: 0, timeliness: "evergreen" });
    // 0.35*0.9 + 0.35*0 + 0.20*0.7 + 0.10*0 = 0.315 + 0.14 = 0.455
    expect(haveScore(rel, "owid")).toBeCloseTo(0.455);
  });

  it("apod source_tier = 0.85", () => {
    const rel = makeRelevance({ hook_strength: 0, structure: 0, timeliness: "evergreen" });
    // 0.35*0.85 + 0.14 = 0.2975 + 0.14 = 0.4375
    expect(haveScore(rel, "apod")).toBeCloseTo(0.4375);
  });

  it("wikidata source_tier = 0.8", () => {
    const rel = makeRelevance({ hook_strength: 0, structure: 0, timeliness: "evergreen" });
    // 0.35*0.8 + 0.14 = 0.28 + 0.14 = 0.42
    expect(haveScore(rel, "wikidata")).toBeCloseTo(0.42);
  });

  it("unknown source_tier = 0.7", () => {
    const rel = makeRelevance({ hook_strength: 0, structure: 0, timeliness: "evergreen" });
    // 0.35*0.7 + 0.14 = 0.245 + 0.14 = 0.385
    expect(haveScore(rel, "unknown_source")).toBeCloseTo(0.385);
  });

  it("null source falls back to tier 1.0", () => {
    const rel = makeRelevance({ hook_strength: 0, structure: 0, timeliness: "evergreen" });
    expect(haveScore(rel, null)).toBeCloseTo(0.49);
  });

  it("breaking timeliness gives freshness 1.0", () => {
    const rel = makeRelevance({ hook_strength: 0, structure: 0, timeliness: "breaking" });
    // 0.35*1.0 + 0 + 0.20*1.0 + 0 = 0.55
    expect(haveScore(rel, "arxiv")).toBeCloseTo(0.55);
  });

  it("hook_strength and structure contribute proportionally", () => {
    const rel = makeRelevance({
      hook_strength: 1,
      structure: 1,
      timeliness: "evergreen",
    });
    // 0.35*1.0 + 0.35*1 + 0.20*0.7 + 0.10*1 = 0.35 + 0.35 + 0.14 + 0.10 = 0.94
    expect(haveScore(rel, "arxiv")).toBeCloseTo(0.94);
  });
});

// ---------------------------------------------------------------------------
// rankCandidates
// ---------------------------------------------------------------------------
describe("rankCandidates", () => {
  it("higher need×have score ranks first", () => {
    const goodRel = makeRelevance({ hook_strength: 1, structure: 1, contexts: ["professional"] });
    const poorRel = makeRelevance({ hook_strength: 0, structure: 0 });
    const high = makePaper({ id: "high", metadata: { relevance: goodRel } });
    const low = makePaper({ id: "low", metadata: { relevance: poorRel } });
    const profile: Profile = { ...BASE_PROFILE, occupation: "professional" };

    const ranked = rankCandidates([low, high], profile, "seed");
    expect(ranked[0].id).toBe("high");
  });

  it("identical scores use deterministic hash tie-break", () => {
    const p1 = makePaper({ id: "paper-a" });
    const p2 = makePaper({ id: "paper-b" });
    // Both have null metadata → both get 0.7 × 0.7 = 0.49
    const r1 = rankCandidates([p1, p2], BASE_PROFILE, "user:2026-07-05");
    const r2 = rankCandidates([p2, p1], BASE_PROFILE, "user:2026-07-05");
    expect(r1.map((p) => p.id)).toEqual(r2.map((p) => p.id));
  });

  it("same seed always produces same order", () => {
    const papers = ["a", "b", "c", "d"].map((id) => makePaper({ id }));
    const a = rankCandidates([...papers], BASE_PROFILE, "stable-seed");
    const b = rankCandidates([...papers].reverse(), BASE_PROFILE, "stable-seed");
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
  });

  it("different seeds produce potentially different tie-break order", () => {
    const papers = ["a", "b", "c"].map((id) => makePaper({ id }));
    const r1 = rankCandidates([...papers], BASE_PROFILE, "seed-1");
    const r2 = rankCandidates([...papers], BASE_PROFILE, "seed-2");
    // They CAN differ; just verify both return all 3 papers
    expect(r1).toHaveLength(3);
    expect(r2).toHaveLength(3);
  });

  it("does not mutate the input array", () => {
    const papers = ["a", "b", "c"].map((id) => makePaper({ id }));
    const original = papers.map((p) => p.id);
    rankCandidates(papers, BASE_PROFILE, "x");
    expect(papers.map((p) => p.id)).toEqual(original);
  });
});
