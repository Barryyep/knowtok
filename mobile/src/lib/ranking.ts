/**
 * ranking.ts — domain-internal paper ranking (algorithm-v1 A2).
 * No LLM calls at runtime; pure math over stored metadata.
 * Formulas: docs/algorithm-v1.md §1.1 (need), §1.2 (have).
 */

import { hashStringToNumber } from "./jsonUtils";
import type { CandidatePaper } from "./paperService";
import type { Profile } from "./types";

/**
 * Local mirror of root src/lib/relevance.ts#RelevanceRecord (read-only ref).
 * Exported so callers can type-hint test fixtures without an out-of-tree import.
 */
export type RelevanceMetadata = {
  contexts: string[];
  utility: "conversation" | "decision" | "self";
  timeliness: "evergreen" | "recent" | "breaking";
  hook_strength: number; // 0-1, LLM "stopping power" score from A1
  structure: number;     // 0-1, regex-derived from A1
};

/** Extract relevance from the opaque metadata blob; null for legacy rows. */
function getRelevance(paper: CandidatePaper): RelevanceMetadata | null {
  const r = paper.metadata?.relevance;
  if (!r || typeof r !== "object") return null;
  return r as RelevanceMetadata;
}

/**
 * needScore — §1.1.
 *
 * need = 0.4 base
 *      + 0.3 × context_match   (contexts includes reader-type id; "parent" ↔ "homemaker")
 *      + 0.2 × utility_match   (social_currency ↔ "conversation"; depth_thinker ↔ "decision"|"self")
 *      + 0.1 × timeliness_match (readingMoment "cracks" ↔ recent|breaking; "professional" ↔ recent; else evergreen)
 *
 * Missing relevance → 0.7 neutral (unscored rows must not be starved or favored).
 */
export function needScore(
  relevance: RelevanceMetadata | null | undefined,
  profile: Profile,
): number {
  if (!relevance) return 0.7;

  const occ = profile.occupation ?? "";
  const interests = profile.interests ?? "";

  // §1.1 context match
  const contextMatch =
    relevance.contexts.includes(occ) ||
    (occ === "homemaker" && relevance.contexts.includes("parent"))
      ? 1
      : 0;

  // §1.1 utility match
  const utilityMatch =
    (interests.includes("social_currency") && relevance.utility === "conversation") ||
    (interests.includes("depth_thinker") &&
      (relevance.utility === "decision" || relevance.utility === "self"))
      ? 1
      : 0;

  // §1.1 timeliness match
  let timelinessMatch = 0;
  if (profile.readingMoment === "cracks") {
    timelinessMatch =
      relevance.timeliness === "recent" || relevance.timeliness === "breaking" ? 1 : 0;
  } else if (occ === "professional") {
    timelinessMatch = relevance.timeliness === "recent" ? 1 : 0;
  } else {
    // All other readers: evergreen content is a match
    timelinessMatch = relevance.timeliness === "evergreen" ? 1 : 0;
  }

  return 0.4 + 0.3 * contextMatch + 0.2 * utilityMatch + 0.1 * timelinessMatch;
}

/**
 * haveScore — §1.2.
 *
 * have = 0.35 × source_tier   (arxiv/openalex 1.0, owid 0.9, apod 0.85, wikidata 0.8, unknown 0.7)
 *      + 0.35 × hook_strength
 *      + 0.20 × freshness      (breaking 1.0; recent|evergreen 0.7 — v1, no date math yet)
 *      + 0.10 × structure
 *
 * Missing relevance → 0.7 neutral.
 */
export function haveScore(
  relevance: RelevanceMetadata | null | undefined,
  source: string | null | undefined,
): number {
  if (!relevance) return 0.7;

  // §1.2 source_tier
  const src = (source ?? "").toLowerCase();
  const sourceTier =
    src === "" || src === "arxiv" || src === "openalex"
      ? 1.0
      : src === "owid"
        ? 0.9
        : src === "apod"
          ? 0.85
          : src === "wikidata"
            ? 0.8
            : 0.7; // unknown

  // §1.2 freshness — v1 proxy: breaking earns full credit, others flat 0.7
  const freshness = relevance.timeliness === "breaking" ? 1.0 : 0.7;

  return (
    0.35 * sourceTier +
    0.35 * relevance.hook_strength +
    0.20 * freshness +
    0.10 * relevance.structure
  );
}

/**
 * rankCandidates — §1 domain-internal sort.
 *
 * Sort by needScore × haveScore desc. Tie-break: per-paper hash keyed by
 * hashSeed (typically "userId:date[:domainId]") so same user+date+domain pool
 * always produces the same order — determinism guarantee from §1.
 *
 * Does NOT filter excludeIds; callers slice the result after filtering so that
 * 換一条 (forceRefresh) naturally yields the next-ranked paper once the top
 * enters excludeIds.
 */
export function rankCandidates(
  papers: CandidatePaper[],
  profile: Profile,
  hashSeed: string,
): CandidatePaper[] {
  return [...papers].sort((a, b) => {
    const relA = getRelevance(a);
    const relB = getRelevance(b);
    const scoreA = needScore(relA, profile) * haveScore(relA, a.source);
    const scoreB = needScore(relB, profile) * haveScore(relB, b.source);
    if (scoreB !== scoreA) return scoreB - scoreA;
    // Tie-break: stable per-paper hash — same seed → same order
    return (
      hashStringToNumber(`${hashSeed}:${a.id}`) -
      hashStringToNumber(`${hashSeed}:${b.id}`)
    );
  });
}
