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
import {
  computeRebalancedWeights,
  isEligiblePersona,
  tallyEventsByUserAndDomain,
  type RebalanceEventRow,
  type RebalancePersonaRow,
} from "../src/lib/curiosity-rebalance";

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
const PAGE_SIZE = 500;

/**
 * Users with a real, non-empty domainWeights map — the only ones this job touches.
 * Paginated (matches scripts/repair-arxiv-categories.ts's convention) — an
 * unbounded .select() silently truncates at the project's Max Rows setting
 * with no error, so an unpaginated query here would eventually drop users
 * from a run with no signal that it happened.
 */
async function fetchEligiblePersonas(): Promise<RebalancePersonaRow[]> {
  const all: RebalancePersonaRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("user_personas")
      .select("user_id, domain_weights")
      .order("user_id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`fetch personas failed: ${error.message}`);
    all.push(...((data ?? []) as RebalancePersonaRow[]));
    if ((data ?? []).length < PAGE_SIZE) break;
  }
  return all.filter(isEligiblePersona);
}

async function fetchWindowEvents(userIds: string[], sinceIso: string): Promise<RebalanceEventRow[]> {
  if (userIds.length === 0) return [];
  const all: RebalanceEventRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("user_events")
      .select("user_id, event_type, metadata")
      .in("user_id", userIds)
      .in("event_type", [...QUALIFYING_EVENT_TYPES])
      .gte("created_at", sinceIso)
      .order("created_at")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`fetch events failed: ${error.message}`);
    all.push(...((data ?? []) as RebalanceEventRow[]));
    if ((data ?? []).length < PAGE_SIZE) break;
  }
  return all;
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

  const talliesByUser = tallyEventsByUserAndDomain(events, VALID_DOMAIN_IDS);

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
