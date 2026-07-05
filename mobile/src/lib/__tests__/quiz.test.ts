import { describe, it, expect } from "vitest";
import {
  applyChoice,
  applyOther,
  applyClassifiedVotes,
  dealRound,
  applyCardPicks,
  quizResult,
  initialQuizState,
  CARD_ROUNDS,
} from "../quiz";
import { SPARKS } from "../taxonomy";
import type { QuizOption, QuizState } from "../quiz";

// ---------------------------------------------------------------------------
// applyChoice
// ---------------------------------------------------------------------------
describe("applyChoice", () => {
  it("merges domain votes into scores", () => {
    const state = initialQuizState();
    const opt: QuizOption = { id: "food", zh: "", en: "", domainVotes: { food: 0.5 } };
    expect(applyChoice(state, opt).scores["food"]).toBe(0.5);
  });

  it("accumulates votes from multiple choices", () => {
    let state = initialQuizState();
    state = applyChoice(state, { id: "a", zh: "", en: "", domainVotes: { tech_ai: 0.25, space: 0.25 } });
    state = applyChoice(state, { id: "b", zh: "", en: "", domainVotes: { tech_ai: 0.25 } });
    expect(state.scores["tech_ai"]).toBe(0.5);
    expect(state.scores["space"]).toBe(0.25);
  });

  it("records styleVote into styleVotes array", () => {
    const state = applyChoice(initialQuizState(), {
      id: "x",
      zh: "",
      en: "",
      styleVote: "depth_thinker",
    });
    expect(state.styleVotes).toContain("depth_thinker");
  });

  it("does not mutate the original state", () => {
    const state = initialQuizState();
    applyChoice(state, { id: "x", zh: "", en: "", domainVotes: { tech_ai: 1 } });
    expect(state.scores["tech_ai"]).toBeUndefined();
  });

  it("handles missing domainVotes without crash", () => {
    expect(() => applyChoice(initialQuizState(), { id: "x", zh: "", en: "" })).not.toThrow();
  });

  it("handles empty domainVotes object without crash", () => {
    expect(() =>
      applyChoice(initialQuizState(), { id: "x", zh: "", en: "", domainVotes: {} }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// applyOther
// ---------------------------------------------------------------------------
describe("applyOther", () => {
  it("records non-blank text with questionId", () => {
    const result = applyOther(initialQuizState(), "album", "landscapes");
    expect(result.otherAnswers).toHaveLength(1);
    expect(result.otherAnswers[0]).toEqual({ questionId: "album", text: "landscapes" });
  });

  it("returns state unchanged for blank text", () => {
    const state = initialQuizState();
    const next = applyOther(state, "album", "   ");
    expect(next.otherAnswers).toHaveLength(0);
    expect(next).toBe(state); // referential identity — no new object
  });

  it("trims surrounding whitespace", () => {
    const result = applyOther(initialQuizState(), "q1", "  hello world  ");
    expect(result.otherAnswers[0].text).toBe("hello world");
  });

  it("appends to existing otherAnswers", () => {
    let state = applyOther(initialQuizState(), "q1", "first");
    state = applyOther(state, "q2", "second");
    expect(state.otherAnswers).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// applyClassifiedVotes
// ---------------------------------------------------------------------------
describe("applyClassifiedVotes", () => {
  it("merges known domain votes into scores", () => {
    const state = applyClassifiedVotes(initialQuizState(), { tech_ai: 0.5, health: 0.3 });
    expect(state.scores["tech_ai"]).toBe(0.5);
    expect(state.scores["health"]).toBe(0.3);
  });

  it("silently drops unknown domains", () => {
    const state = applyClassifiedVotes(initialQuizState(), { unknown_domain: 1.0, alien: 0.5 });
    expect(Object.keys(state.scores)).toHaveLength(0);
  });

  it("accumulates with pre-existing scores", () => {
    let state = applyChoice(initialQuizState(), {
      id: "x",
      zh: "",
      en: "",
      domainVotes: { tech_ai: 0.5 },
    });
    state = applyClassifiedVotes(state, { tech_ai: 0.25 });
    expect(state.scores["tech_ai"]).toBeCloseTo(0.75);
  });

  it("does not mutate the original state", () => {
    const state = initialQuizState();
    applyClassifiedVotes(state, { tech_ai: 1 });
    expect(state.scores["tech_ai"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// dealRound
// ---------------------------------------------------------------------------
describe("dealRound", () => {
  it("rounds 0-4 deal 5 cards", () => {
    for (let r = 0; r <= 4; r++) {
      const { trio } = dealRound(initialQuizState(), r);
      expect(trio).toHaveLength(5);
    }
  });

  it("finals (round 5) deal 3 cards", () => {
    const { trio } = dealRound(initialQuizState(), 5);
    expect(trio).toHaveLength(3);
  });

  it("no duplicate domains in a deal (all rounds)", () => {
    for (let r = 0; r <= 5; r++) {
      const { trio } = dealRound(initialQuizState(), r);
      const ids = trio.map((s) => s.domainId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("round 4 (wildcard) surfaces lowest-scored domains", () => {
    // Give tech_ai, health, space big scores so they rank high.
    let state = applyCardPicks(initialQuizState(), ["tech_ai", "health", "space"], 0);
    state = applyCardPicks(state, ["tech_ai", "health"], 1);
    const { trio } = dealRound(state, 4);
    const ids = trio.map((s) => s.domainId);
    // Round 4 is the reversed ranking, so the top 3 scorers should not dominate
    const dominated = ids.filter((d) => ["tech_ai", "health", "space"].includes(d));
    // At most one high-scorer should appear (5 lowest = all others first)
    expect(dominated.length).toBeLessThanOrEqual(1);
  });

  it("deterministic: identical state → identical trio", () => {
    const state = initialQuizState();
    const { trio: a } = dealRound(state, 0);
    const { trio: b } = dealRound(state, 0);
    expect(a.map((s) => s.domainId)).toEqual(b.map((s) => s.domainId));
  });

  it("advances used counter for all dealt domains", () => {
    const state = initialQuizState();
    const { trio, state: next } = dealRound(state, 0);
    for (const spark of trio) {
      expect(next.used[spark.domainId]).toBe(1);
    }
  });

  it("marks dealt domains in the dealt array", () => {
    const { trio, state: next } = dealRound(initialQuizState(), 0);
    for (const spark of trio) {
      expect(next.dealt).toContain(spark.domainId);
    }
  });

  it("all dealt sparks belong to their domain", () => {
    for (let r = 0; r <= 5; r++) {
      const { trio } = dealRound(initialQuizState(), r);
      for (const spark of trio) {
        expect(SPARKS.some((s) => s.domainId === spark.domainId && s.en === spark.en)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// applyCardPicks
// ---------------------------------------------------------------------------
describe("applyCardPicks", () => {
  it("multi-round adds +1 per selected domain", () => {
    const state = applyCardPicks(initialQuizState(), ["tech_ai", "health"], 0);
    expect(state.scores["tech_ai"]).toBe(1);
    expect(state.scores["health"]).toBe(1);
  });

  it("finals (round 5) adds +2 per selected domain", () => {
    const state = applyCardPicks(initialQuizState(), ["mind"], CARD_ROUNDS - 1);
    expect(state.scores["mind"]).toBe(2);
  });

  it("empty selection is legal and changes nothing", () => {
    const state = applyCardPicks(initialQuizState(), [], 0);
    expect(state.scores).toEqual({});
    expect(state.cardPicks).toHaveLength(0);
  });

  it("appends picked domains to cardPicks array", () => {
    const state = applyCardPicks(initialQuizState(), ["tech_ai", "space"], 2);
    expect(state.cardPicks).toContain("tech_ai");
    expect(state.cardPicks).toContain("space");
  });

  it("does not mutate original state", () => {
    const state = initialQuizState();
    applyCardPicks(state, ["tech_ai"], 0);
    expect(state.scores["tech_ai"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// quizResult
// ---------------------------------------------------------------------------
describe("quizResult", () => {
  it("caps output at 4 domains even with 7+ non-zero scores", () => {
    let state = initialQuizState();
    const domains = ["tech_ai", "health", "space", "mind", "money", "food", "climate"];
    domains.forEach((d) => {
      state = applyCardPicks(state, [d], 0);
    });
    expect(quizResult(state).domains.length).toBeLessThanOrEqual(4);
  });

  it("top domain always has strength 1.0", () => {
    let state = initialQuizState();
    state = applyCardPicks(state, ["tech_ai"], 0);
    state = applyCardPicks(state, ["tech_ai"], 1);
    state = applyCardPicks(state, ["health"], 0);
    const result = quizResult(state);
    expect(result.domains[0].id).toBe("tech_ai");
    expect(result.domains[0].strength).toBe(1);
  });

  it("lower domains have strength < 1", () => {
    let state = initialQuizState();
    state = applyCardPicks(state, ["tech_ai"], 0);
    state = applyCardPicks(state, ["tech_ai"], 1);
    state = applyCardPicks(state, ["health"], 0);
    const result = quizResult(state);
    expect(result.domains[1].strength).toBeLessThan(1);
  });

  it("zero-state: no domains, default style social_currency", () => {
    const result = quizResult(initialQuizState());
    expect(result.domains).toHaveLength(0);
    expect(result.style).toBe("social_currency");
  });

  it("style: last styleVote wins", () => {
    let state = initialQuizState();
    state = applyChoice(state, { id: "a", zh: "", en: "", styleVote: "social_currency" });
    state = applyChoice(state, { id: "b", zh: "", en: "", styleVote: "depth_thinker" });
    state = applyChoice(state, { id: "c", zh: "", en: "", styleVote: "social_currency" });
    expect(quizResult(state).style).toBe("social_currency");
  });

  it("excludes zero-score domains from results", () => {
    let state = initialQuizState();
    // Only tech_ai gets a vote
    state = applyCardPicks(state, ["tech_ai"], 0);
    const result = quizResult(state);
    expect(result.domains.every((d) => d.id === "tech_ai")).toBe(true);
    expect(result.domains).toHaveLength(1);
  });
});
