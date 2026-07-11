/**
 * Rolling rescan window shared by ingest pipelines that key off a
 * publication-date search (PubMed PDAT, NASA APOD's date param). A
 * single-day, non-overlapping window silently and permanently drops content
 * whenever the source hasn't indexed/published "today" yet at cron time —
 * this is what caused PubMed and APOD to go quiet for days at a stretch.
 * Every run instead rescans the last `lookbackDays` days; the ingest
 * scripts' existing idempotency checks (dedup on PMID / date) make
 * re-scanning already-seen days free, so widening the window costs nothing
 * but a few extra API calls for rows that get skipped.
 */
export function rollingLookbackWindow(
  now: Date,
  lookbackDays: number,
): { startDate: string; endDate: string } {
  const endDate = now.toISOString().slice(0, 10);
  const start = new Date(now);
  start.setDate(start.getDate() - lookbackDays);
  const startDate = start.toISOString().slice(0, 10);
  return { startDate, endDate };
}
