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

/** Minimal shape of a `user_personas` row the rebalance job reads. */
export interface RebalancePersonaRow {
  user_id: string;
  domain_weights: Record<string, number> | null;
}

/** Minimal shape of a `user_events` row the rebalance job reads. */
export interface RebalanceEventRow {
  user_id: string;
  event_type: string;
  metadata: { domain?: string } | null;
}

/**
 * Only personas with a real, non-empty domainWeights map are touched by the
 * rebalance job — it augments an existing persona, it never creates one from
 * scratch. Pure so it's testable without Supabase — see
 * scripts/rebalance-curiosity.ts (fetchEligiblePersonas).
 */
export function isEligiblePersona(row: RebalancePersonaRow): boolean {
  return Boolean(row.domain_weights && Object.keys(row.domain_weights).length > 0);
}

/**
 * Tally qualifying events (swap/share/source_tap) per user and per taxonomy
 * domain. Events with a missing/unknown/stale domain (pre-migration rows, or
 * rows logged before the fact.domain fix landed, or a since-renamed taxonomy
 * id) are safely ignored rather than crashing the job. Pure so it's testable
 * without Supabase — see scripts/rebalance-curiosity.ts.
 */
export function tallyEventsByUserAndDomain(
  events: RebalanceEventRow[],
  validDomainIds: ReadonlySet<string>,
): Map<string, Record<string, DomainEventTally>> {
  const byUser = new Map<string, Record<string, DomainEventTally>>();
  for (const event of events) {
    const domain = event.metadata?.domain;
    if (!domain || !validDomainIds.has(domain)) continue;

    let userTallies = byUser.get(event.user_id);
    if (!userTallies) {
      userTallies = {};
      byUser.set(event.user_id, userTallies);
    }
    const tally = userTallies[domain] ?? { swap: 0, share: 0, sourceTap: 0 };
    if (event.event_type === "swap") tally.swap += 1;
    else if (event.event_type === "share") tally.share += 1;
    else if (event.event_type === "source_tap") tally.sourceTap += 1;
    userTallies[domain] = tally;
  }
  return byUser;
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
