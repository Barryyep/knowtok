/**
 * Smoke test for the v2 domain-aware routing.
 *
 * The real helpers (paperService.domainsToCategories, factService's daily
 * rotation, personaTrack.getWikiDomains) live in mobile modules that pull in
 * React Native deps (AsyncStorage / url-polyfill) and cannot load in plain
 * Node. This script therefore imports the FROZEN pure contract
 * (mobile/src/lib/taxonomy.ts) + the pure hash (jsonUtils.ts) and runs the
 * IDENTICAL deterministic algorithm those helpers use, so the resolved
 * track/domain/categories match what the app would compute.
 *
 * Usage: npx tsx scripts/smoke-routing.ts
 */

import { DOMAINS, domainById } from "../mobile/src/lib/taxonomy";
import { hashStringToNumber } from "../mobile/src/lib/jsonUtils";

type Lang = "zh" | "en";
type Profile = { occupation: string; curiosityDomains: string[]; language: Lang };

// Mirrors paperService.domainsToCategories.
function domainsToCategories(domains: string[]): string[] {
  const out = new Set<string>();
  for (const token of domains) {
    const d = domainById(token);
    if (d) {
      out.add(d.id);
      for (const legacy of d.legacyCategories) out.add(legacy);
    } else {
      out.add(token);
    }
  }
  return Array.from(out);
}

// Mirrors factService.buildDomainRotatedFact's day-domain selection.
function resolveForDate(profile: Profile, userId: string, date: string, forceRefresh = false) {
  const selected = profile.curiosityDomains.filter((id) => domainById(id));
  const excludeCount = 0; // fresh day, no history
  const rotation = forceRefresh ? Math.max(1, excludeCount) : 0;
  const dayIndex = (hashStringToNumber(`${userId}:${date}`) + rotation) % selected.length;
  const domainId = selected[dayIndex];
  const domain = domainById(domainId)!;
  const paperCapable = domain.sources.includes("papers");
  // paper flow requires papers to EXIST for that domain — here we report the
  // capability; the app then falls back to the general flow if none are found.
  const track = paperCapable ? "paper" : "general";
  const categories = paperCapable ? domainsToCategories([domainId]) : [];
  const focusDomain = domain[profile.language];
  return { domainId, track, paperCapable, categories, focusDomain };
}

function main() {
  const profile: Profile = {
    occupation: "建筑工人",
    curiosityDomains: ["history", "nature"],
    language: "zh",
  };
  const userId = "smoke-user";
  const dates = ["2026-07-04", "2026-07-05", "2026-07-06"];

  console.log("=== profile ===");
  console.log(JSON.stringify(profile));
  console.log(
    "\ngetWikiDomains (grounding seeds):",
    JSON.stringify(
      profile.curiosityDomains
        .filter((id) => domainById(id))
        .map((id) => {
          const d = domainById(id)!;
          return { id: d.id, zh: d.zh, en: d.en };
        }),
    ),
  );

  console.log("\n=== per-day routing ===");
  for (const date of dates) {
    const r = resolveForDate(profile, userId, date);
    console.log(
      `${date}  domain=${r.domainId}  track=${r.track}  paperCapable=${r.paperCapable}  ` +
        `focusDomain=${r.focusDomain}  categories=[${r.categories.join(", ")}]`,
    );
  }

  console.log("\n=== 换一条 on 2026-07-04 (rotates domain) ===");
  const base = resolveForDate(profile, userId, "2026-07-04");
  const refreshed = resolveForDate(profile, userId, "2026-07-04", true);
  console.log(`base      → domain=${base.domainId} track=${base.track}`);
  console.log(`refreshed → domain=${refreshed.domainId} track=${refreshed.track}`);

  console.log("\n=== sanity: a paper-capable domain expands to human_category values ===");
  for (const id of ["climate", "health", "tech_ai", "space", "history"]) {
    const d = domainById(id)!;
    console.log(
      `${id}  sources=[${d.sources.join(",")}]  → categories=[${domainsToCategories([id]).join(", ")}]`,
    );
  }
  console.log("\nDOMAINS in taxonomy:", DOMAINS.length);
}

main();
