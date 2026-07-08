/**
 * Pure weighting logic for the weekly curiosity rebalance job
 * (scripts/rebalance-curiosity.ts). Kept separate from I/O so it's testable
 * without hitting Supabase — see tests/unit/curiosity-rebalance.test.ts.
 *
 * Founder principle (TODOS.md): "选择多了也就知道了" — every in-app choice is
 * an implicit questionnaire answer. 换一条 (swap) is a soft veto of the shown
 * domain, share is a strong positive signal, a source-link tap is a moderate
 * positive (depth interest, they clicked through).
 */

/** Per-domain event counts tallied over the trailing window. */
export interface DomainEventTally {
  swap: number;
  share: number;
  sourceTap: number;
}

/**
 * Per-event point values. Chosen so a single share clearly outweighs a
 * single swap-away, and a source tap sits between the two — simple integers,
 * not a tuned model. Swap is negative but small: swapping once shouldn't tank
 * a domain the user is still broadly curious about.
 */
export const REBALANCE_POINTS = {
  swap: -1,
  share: 3,
  sourceTap: 1,
} as const;

/** Size of one rebalance nudge — small so weights drift as a living curve
 * across many weeks rather than swinging on a single week's events. */
export const REBALANCE_STEP = 0.05;

/** Weights never fully zero out from one bad week — RadarScreen already
 * guards against dropping below 2 active domains client-side; the job
 * shouldn't fight that guard by driving a domain to 0. */
export const WEIGHT_FLOOR = 0.05;
export const WEIGHT_CEILING = 1.0;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Nudge a user's existing domainWeights based on their trailing-window event
 * tallies. Domains absent from `eventTallies` (zero events in the window)
 * keep their existing weight unchanged. Domains absent from `currentWeights`
 * are ignored — this job augments an existing persona, it doesn't invent new
 * domains for the user.
 */
export function computeRebalancedWeights(
  currentWeights: Record<string, number>,
  eventTallies: Record<string, DomainEventTally>,
): Record<string, number> {
  const next: Record<string, number> = { ...currentWeights };

  for (const [domain, weight] of Object.entries(currentWeights)) {
    const tally = eventTallies[domain];
    if (!tally) continue; // no events this window — unchanged

    const delta =
      tally.swap * REBALANCE_POINTS.swap +
      tally.share * REBALANCE_POINTS.share +
      tally.sourceTap * REBALANCE_POINTS.sourceTap;
    if (delta === 0) continue;

    next[domain] = clamp(weight + REBALANCE_STEP * delta, WEIGHT_FLOOR, WEIGHT_CEILING);
  }

  return next;
}
