-- Widens user_events to accept mobile's event vocabulary alongside the web
-- app's, and adds a durable home for per-domain curiosity weights so the
-- weekly rebalance job (scripts/rebalance-curiosity.ts) has a column to
-- read/write. Additive — safe to run against live data, no drops.
-- ============================================================

-- ============================================================
-- USER EVENTS: widen event_type CHECK
-- ============================================================
-- Postgres auto-names an unnamed CHECK on CREATE TABLE as
-- "<table>_<column>_check" — 20260322_003_fresh_start.sql (line ~121) declared
-- the constraint inline without a name, so this should be the live name. Using
-- IF EXISTS defensively in case a prior manual migration renamed it.
ALTER TABLE public.user_events DROP CONSTRAINT IF EXISTS user_events_event_type_check;

ALTER TABLE public.user_events ADD CONSTRAINT user_events_event_type_check
  CHECK (event_type IN (
    -- web vocabulary (src/lib/*, unchanged)
    'view', 'skip', 'save', 'impact_click', 'impact_refresh',
    -- mobile vocabulary (mobile/src/lib/events.ts EventType)
    'fact_shown', 'swap', 'flip', 'share', 'source_tap'
  ));

-- ============================================================
-- USER PERSONAS: durable per-domain curiosity weights
-- ============================================================
-- Mirrors mobile Profile.domainWeights (0..1 strength per taxonomy domain
-- id, see mobile/src/lib/taxonomy.ts). Was local-only; this lets the weekly
-- rebalance job (and any future device) read/write a synced copy.
ALTER TABLE public.user_personas ADD COLUMN IF NOT EXISTS domain_weights JSONB NOT NULL DEFAULT '{}'::jsonb;
