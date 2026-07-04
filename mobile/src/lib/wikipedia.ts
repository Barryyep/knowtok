import type { AppLanguage } from "./types";

/**
 * Wikipedia grounding for the free tier. We hit the keyless Wikimedia REST
 * endpoints (search + page summary) on the zh or en subdomain, then hand the
 * extract to the LLM so the generated fact is anchored to a real, citable page.
 *
 * Wikimedia REQUIRES a descriptive User-Agent with a contact — sending one is
 * mandatory, not optional.
 */
const USER_AGENT = "KnowTok/0.1 (https://knowtok.app; contact: hello@knowtok.app)";
const FETCH_TIMEOUT_MS = 8_000;

export interface WikiGrounding {
  /** Canonical page title as Wikipedia spells it. */
  pageTitle: string;
  /** Plain-text lead extract, trimmed to a usable grounding length. */
  extract: string;
  /** Human-facing canonical page URL (content_urls.desktop.page). */
  pageUrl: string;
  lang: AppLanguage;
}

function subdomain(lang: AppLanguage): string {
  return lang === "zh" ? "zh" : "en";
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`wikipedia HTTP ${res.status}`);
    return (await res.json()) as unknown;
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve a free-text term to the best-matching page key, or null. */
async function searchPageKey(term: string, lang: AppLanguage): Promise<string | null> {
  const url =
    `https://${subdomain(lang)}.wikipedia.org/w/rest.php/v1/search/page` +
    `?q=${encodeURIComponent(term)}&limit=1`;
  const data = (await fetchJson(url)) as { pages?: Array<{ key?: string; title?: string }> };
  const first = data.pages?.[0];
  return first?.key || first?.title || null;
}

/** Fetch the lead-section summary for a resolved page key. */
async function pageSummary(pageKey: string, lang: AppLanguage): Promise<WikiGrounding | null> {
  const url =
    `https://${subdomain(lang)}.wikipedia.org/api/rest_v1/page/summary/` +
    encodeURIComponent(pageKey);
  const data = (await fetchJson(url)) as {
    type?: string;
    title?: string;
    extract?: string;
    content_urls?: { desktop?: { page?: string } };
  };
  // Disambiguation / empty pages are useless as grounding.
  if (data.type === "disambiguation") return null;
  const extract = (data.extract || "").replace(/\s+/g, " ").trim();
  const pageUrl = data.content_urls?.desktop?.page || "";
  const pageTitle = (data.title || pageKey).trim();
  if (extract.length < 60 || !pageUrl) return null;
  return {
    pageTitle,
    // ~500 chars is enough context to ground one fact without bloating the prompt.
    extract: extract.length > 500 ? `${extract.slice(0, 500)}…` : extract,
    pageUrl,
    lang,
  };
}

/**
 * Try each candidate term in order; return the first that yields a usable
 * extract. Returns null if Wikipedia is unreachable or nothing matches — the
 * caller then falls back to ungrounded generation.
 */
export async function fetchWikiGrounding(
  terms: string[],
  lang: AppLanguage,
): Promise<WikiGrounding | null> {
  const seen = new Set<string>();
  for (const raw of terms) {
    const term = raw.trim();
    if (!term || seen.has(term.toLowerCase())) continue;
    seen.add(term.toLowerCase());
    try {
      const key = await searchPageKey(term, lang);
      if (!key) continue;
      const summary = await pageSummary(key, lang);
      if (summary) return summary;
    } catch {
      // Network/timeout on one term — try the next.
    }
  }
  return null;
}
