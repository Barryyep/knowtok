import { timingSafeEqual } from "node:crypto";
import { getIngestSecret } from "@/lib/env";

/**
 * Constant-time check of an incoming `x-ingest-secret` header against the
 * configured shared secret. Length is compared first because
 * `timingSafeEqual` throws on differing buffer lengths — a length mismatch is
 * simply treated as a non-match rather than leaking timing via early return.
 */
export function verifyIngestSecret(incoming: string | null | undefined): boolean {
  if (!incoming) return false;
  const expected = getIngestSecret();
  const a = Buffer.from(incoming, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
