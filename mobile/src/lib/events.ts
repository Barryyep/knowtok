/**
 * events.ts — behavior-event sink for algorithm-v1 §3 metrics.
 *
 * All events write to the `user_events` Supabase table (columns:
 * id uuid PK, user_id uuid, paper_id uuid nullable FK→papers,
 * event_type text, metadata jsonb, created_at timestamptz).
 *
 * Design constraints:
 *  • Fire-and-forget — never awaited in interaction paths (zero UI latency).
 *  • Never throws — failures are silently swallowed.
 *  • No-op when the user is not signed in.
 */

import { supabase } from "./supabase";

export type EventType = "fact_shown" | "swap" | "flip" | "share" | "source_tap";

export interface EventPayload {
  factId?: string;
  domain?: string;
  date?: string;
  wildcard?: boolean;
}

/**
 * Enqueue a behavior event. Immediately returns; the insert runs async.
 * Call sites: `logEvent("swap", { factId, domain, date })` — no await needed.
 */
export function logEvent(type: EventType, payload: EventPayload): void {
  void (async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;
      await supabase.from("user_events").insert({
        user_id: session.user.id,
        event_type: type,
        metadata: payload,
      });
    } catch {
      // Silent — events must not surface errors to the user.
    }
  })();
}
