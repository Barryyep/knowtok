/**
 * Weekly curiosity rebalance — the "隐式好奇心学习" job.
 *
 * Founder principle (TODOS.md): "选择多了也就知道了" — every in-app choice
 * (换一条/swap, share, source-link tap) is an implicit questionnaire answer.
 * This job reads the trailing 7 days of `user_events`, tallies those three
 * event types per taxonomy domain, and nudges each user's existing
 * `user_personas.domain_weights` toward what they actually engaged with —
 * a living curve on top of the one-time onboarding snapshot, not a
 * replacement for it.
 *
 * Only processes users who already have domainWeights set (non-empty
 * domain_weights) — this augments existing personas, it never creates one
 * from scratch. Domains with zero qualifying events in the window are left
 * untouched. The actual weighting math lives in src/lib/curiosity-rebalance.ts
 * (computeRebalancedWeights) so it's unit-testable without Supabase.
 *
 * Usage:
 *   npx tsx scripts/rebalance-curiosity.ts
 */

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: true, quiet: true });
loadDotenv({ path: ".env", override: false, quiet: true });

import { createClient } from "@supabase/supabase-js";
import { DOMAINS } from "../mobile/src/lib/taxonomy";
import { computeRebalancedWeights, type DomainEventTally } from "../src/lib/curiosity-rebalance";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const WINDOW_DAYS = 7;
const VALID_DOMAIN_IDS = new Set(DOMAINS.map((d) => d.id));
const QUALIFYING_EVENT_TYPES = ["swap", "share", "source_tap"] as const;

interface PersonaRow {
  user_id: string;
  domain_weights: Record<string, number> | null;
}

interface EventRow {
  user_id: string;
  event_type: string;
  metadata: { domain?: string } | null;
}

/** Users with a real, non-empty domainWeights map — the only ones this job touches. */
async function fetchEligiblePersonas(): Promise<PersonaRow[]> {
  const { data, error } = await supabase.from("user_personas").select("user_id, domain_weights");
  if (error) throw new Error(`fetch personas failed: ${error.message}`);
  return ((data ?? []) as PersonaRow[]).filter(
    (row) => row.domain_weights && Object.keys(row.domain_weights).length > 0,
  );
}

async function fetchWindowEvents(userIds: string[], sinceIso: string): Promise<EventRow[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await supabase
    .from("user_events")
    .select("user_id, event_type, metadata")
    .in("user_id", userIds)
    .in("event_type", QUALIFYING_EVENT_TYPES as unknown as string[])
    .gte("created_at", sinceIso);
  if (error) throw new Error(`fetch events failed: ${error.message}`);
  return (data ?? []) as EventRow[];
}

/** user_id -> domain -> tally. Events with a missing/unknown/legacy domain
 * (pre-migration rows, or rows logged before the fact.domain fix landed) are
 * safely ignored rather than crashing the job. */
function tallyEventsByUserAndDomain(events: EventRow[]): Map<string, Record<string, DomainEventTally>> {
  const byUser = new Map<string, Record<string, DomainEventTally>>();
  for (const event of events) {
    const domain = event.metadata?.domain;
    if (!domain || !VALID_DOMAIN_IDS.has(domain)) continue;

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

async function main() {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  console.log(`[rebalance] window: last ${WINDOW_DAYS} days (since ${since})`);

  const personas = await fetchEligiblePersonas();
  console.log(`[rebalance] eligible personas (non-empty domainWeights): ${personas.length}`);
  if (personas.length === 0) {
    console.log("[rebalance] nothing to do");
    return;
  }

  const events = await fetchWindowEvents(personas.map((p) => p.user_id), since);
  console.log(`[rebalance] qualifying events fetched: ${events.length}`);

  const talliesByUser = tallyEventsByUserAndDomain(events);

  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const persona of personas) {
    const currentWeights = persona.domain_weights ?? {};
    const tallies = talliesByUser.get(persona.user_id) ?? {};
    const nextWeights = computeRebalancedWeights(currentWeights, tallies);

    const changed = Object.keys(nextWeights).some(
      (domain) => nextWeights[domain] !== currentWeights[domain],
    );
    if (!changed) {
      unchanged += 1;
      continue;
    }

    const { error } = await supabase
      .from("user_personas")
      .update({ domain_weights: nextWeights })
      .eq("user_id", persona.user_id);
    if (error) {
      failed += 1;
      console.error(`  [FAIL] ${persona.user_id}: ${error.message}`);
      continue;
    }
    updated += 1;
    console.log(`  [OK] ${persona.user_id}: ${JSON.stringify(currentWeights)} -> ${JSON.stringify(nextWeights)}`);
  }

  console.log("\n[rebalance] === SUMMARY ===");
  console.log(`  eligible personas: ${personas.length}`);
  console.log(`  updated: ${updated}`);
  console.log(`  unchanged (no qualifying events): ${unchanged}`);
  console.log(`  failed: ${failed}`);
}

main().catch((err) => {
  console.error("rebalance-curiosity crashed:", err);
  process.exit(1);
});
