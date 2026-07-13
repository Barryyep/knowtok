/**
 * PubMed high-impact-journal ingest — daily new-content pipeline that gives Ohlo
 * a steady stream of freshly published, peer-reviewed facts stamped with a
 * prestige-journal venue ("Nature Medicine", "The Lancet", ...).
 *
 * COPYRIGHT RULE (hard — never remove this comment):
 *   PubMed article ABSTRACTS are copyrighted by the publisher (NLM asserts no
 *   copyright over the metadata, but the abstract text belongs to Elsevier /
 *   Springer Nature / NEJM / etc.). We are allowed to READ an abstract in
 *   memory, extract a single verifiable FACT, and restate it in our OWN words
 *   with a DOI citation — the same thing science journalists do every day.
 *   We are NOT allowed to copy, translate, or store the abstract text.
 *
 *   Therefore:
 *     - The fetched abstract is passed to the LLM only, then discarded.
 *     - It is NEVER written to any column. The `abstract` column (NOT NULL in
 *       schema) is filled with the LLM's OWN restated plain-English summary,
 *       not the source abstract.
 *     - The LLM prompt forbids copying/translating sentences and requires the
 *       fact to be restated. If no standalone verifiable fact exists → skip.
 *
 * Only bibliographic metadata (title, journal, DOI, date — all facts, not
 * copyrightable) plus our derivative hooks/summaries are stored. Users see our
 * restatement + journal citation + a doi.org link to the official page; we host
 * no source text.
 *
 * Pipeline (mirrors ingest-apod.ts / ingest-owid-grapher.ts):
 *   1. esearch  — (journalA[Journal] OR journalB[Journal] ...) AND <date>[PDAT]
 *   2. efetch   — pull title + abstract + journal + DOI + date for each PMID
 *   3. LLM      — read title+abstract, extract & restate ONE fact (zh+en, v5)
 *   4. rank     — sort by relevance.hook_strength, keep top ~20 per run
 *   5. upsert   — source='pubmed', idempotent on source_id (PMID)
 *
 * Rows:
 *   source='pubmed', source_id=PMID, arxiv_id_base='pubmed-'+PMID,
 *   human_category=chosen domain id, abs_url='https://doi.org/'+DOI
 *   (fallback https://pubmed.ncbi.nlm.nih.gov/PMID/),
 *   metadata.venue=<journal display name>, metadata.relevance=<scored>.
 *
 * Usage:
 *   npx tsx scripts/ingest-pubmed.ts                    # rolling DEFAULT_LOOKBACK_DAYS window
 *   npx tsx scripts/ingest-pubmed.ts --date=2026-07-03  # a specific PDAT day
 *   npx tsx scripts/ingest-pubmed.ts --days=3           # last 3 days (backfill)
 *
 * Rate limits: uses NCBI_API_KEY if present (10 req/s) else keyless (3 req/s);
 * polite sleeps accordingly. tool=OhloIngest + email are sent on every request.
 */

import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local", override: true, quiet: true });
loadDotenv({ path: ".env", override: false, quiet: true });

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { XMLParser } from "fast-xml-parser";
import { DOMAINS } from "../mobile/src/lib/taxonomy";
import { generateRelevance, scoreStructure } from "../src/lib/relevance";
import { rollingLookbackWindow } from "../src/lib/ingest-window";

// ── env ──────────────────────────────────────────────────────────────────────

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL_LOW_COST || "gpt-4o-mini";
const NCBI_API_KEY = process.env.NCBI_API_KEY ?? "";
const NCBI_EMAIL = process.env.NCBI_EMAIL ?? "hello@ohlo.app";
const NCBI_TOOL = "OhloIngest";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !OPENAI_API_KEY) {
  console.error(
    "Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// NCBI rate limits: 10 req/s with a key, 3 req/s without. Sleep a touch over the
// per-request budget to stay polite and avoid 429s.
const NCBI_SLEEP_MS = NCBI_API_KEY ? 120 : 360;

// ── META_HOOK_PATTERN — mirrors src/lib/llm.ts ───────────────────────────────
const META_HOOK_PATTERN =
  /这个新?(方法|技术|模型|模拟器|系统|研究)|^一[种个][^，。]{0,10}(方法|技术|模型|系统|工具|拍卖|模拟器|算法)|该研究|这项(研究|技术)|真吓人|太(神奇|可怕|疯狂)了|惊呆|绝了|[!！]\s*$|[—―–]|this (new )?(method|model|approach|technique|study|simulator|system)|the (researchers|study|paper)|(terrifying|mind-blowing|amazing)[.!]?\s*$/i;

// ── Journal whitelist ────────────────────────────────────────────────────────
// key   = the exact PubMed [Journal] term (NLM Title Abbreviation) — every entry
//         was verified against esearch "<abbr>"[Journal] returning hits.
// venue = the prestige display name shown as the source stamp.
// domain= DEFAULT taxonomy domain; the LLM may re-assign a better-fitting one
//         from the 10 taxonomy ids based on the actual fact content.
const JOURNALS: ReadonlyArray<{ nlm: string; venue: string; domain: string }> = [
  { nlm: "Nat Med", venue: "Nature Medicine", domain: "health" },
  { nlm: "Lancet", venue: "The Lancet", domain: "health" },
  { nlm: "N Engl J Med", venue: "New England Journal of Medicine", domain: "health" },
  { nlm: "BMJ", venue: "BMJ", domain: "health" },
  { nlm: "Cell", venue: "Cell", domain: "nature" },
  { nlm: "Nature", venue: "Nature", domain: "nature" },
  { nlm: "Nat Genet", venue: "Nature Genetics", domain: "nature" },
  { nlm: "Nat Neurosci", venue: "Nature Neuroscience", domain: "mind" },
  { nlm: "Nat Hum Behav", venue: "Nature Human Behaviour", domain: "society" },
  { nlm: "Neuron", venue: "Neuron", domain: "mind" },
  { nlm: "Nat Clim Chang", venue: "Nature Climate Change", domain: "climate" },
  { nlm: "Nat Sustain", venue: "Nature Sustainability", domain: "climate" },
  { nlm: "Nat Food", venue: "Nature Food", domain: "food" },
  { nlm: "Lancet Public Health", venue: "The Lancet Public Health", domain: "society" },
  { nlm: "Proc Natl Acad Sci U S A", venue: "PNAS", domain: "nature" },
];

// Map an NLM abbreviation (as returned in the fetched XML Journal/ISOAbbreviation
// or Journal/Title) back to our display venue + default domain.
const VENUE_BY_NLM = new Map(JOURNALS.map((j) => [j.nlm.toLowerCase(), j]));

// Full-title fallbacks so a fetched <Title> like "Nature medicine" also resolves.
const VENUE_BY_TITLE = new Map(
  JOURNALS.map((j) => [j.venue.toLowerCase(), j]),
);

const DOMAIN_MENU = DOMAINS.map((d) => ({ id: d.id, zh: d.zh, en: d.en }));
const VALID_DOMAIN_IDS = new Set(DOMAINS.map((d) => d.id));

// Extraction/insert caps.
// NCBI's PDAT (publication date) index lags real-time by a few days — an
// article dated "yesterday" often doesn't show up in esearch until 2-3 days
// later. A single-day, non-overlapping window (the old default) permanently
// misses whatever wasn't indexed yet at run time. Instead, every run rescans
// a rolling window; fetchExistingPmids() (idempotent on PMID) makes re-scanning
// already-seen days free, so widening the window costs nothing but esearch/efetch
// calls for PMIDs we'll just skip.
const DEFAULT_LOOKBACK_DAYS = 5;
const RETMAX = 1000; // must exceed a 5-day, 15-journal esearch result count — see DEFAULT_LOOKBACK_DAYS
const MAX_EXTRACT = 200; // bound LLM cost per run regardless of window size (~$0.08)
const DAILY_CAP = 60; // keep top-N by hook_strength across all venues
const PER_VENUE_CAP = 10; // no single journal (e.g. PNAS) may dominate a run
const LLM_CONCURRENCY = 3;

// ── types ─────────────────────────────────────────────────────────────────────

type FetchedArticle = {
  pmid: string;
  title: string;
  abstract: string; // in-memory only — NEVER stored
  venue: string;
  defaultDomain: string;
  doi: string | null;
  publishedAt: string; // YYYY-MM-DD
};

type Insight = {
  hook: string;
  hookZh: string;
  plainSummary: string;
  plainSummaryZh: string;
  domain: string;
};

type Candidate = FetchedArticle & { insight: Insight };

// ── helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeHook(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= 100) return trimmed;
  return `${trimmed.slice(0, 97).trimEnd().replace(/[,.!?;:]+$/, "")}.`;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addNcbiParams(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  let out = `${url}${sep}tool=${NCBI_TOOL}&email=${encodeURIComponent(NCBI_EMAIL)}`;
  if (NCBI_API_KEY) out += `&api_key=${NCBI_API_KEY}`;
  return out;
}

async function ncbiFetch(url: string): Promise<Response> {
  const res = await fetch(addNcbiParams(url), {
    headers: { "User-Agent": `${NCBI_TOOL}/1.0 (github.com/Barryyep/knowtok; ${NCBI_EMAIL})` },
  });
  await sleep(NCBI_SLEEP_MS);
  return res;
}

// ── XML text collector ────────────────────────────────────────────────────────
// fast-xml-parser is configured with attributeNamePrefix "@_" so we can tell
// attributes (skip) from element text (keep). Recursively concatenates all text,
// which correctly flattens labeled multi-section AbstractText and inline markup
// (<i>, <sub>, ...) inside titles/abstracts.
function collectText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(" ");
  if (typeof node === "object") {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k.startsWith("@_")) continue; // attribute — not text
      parts.push(collectText(v));
    }
    return parts.join(" ");
  }
  return "";
}

function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

// ── esearch ───────────────────────────────────────────────────────────────────

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

async function esearchPmids(minDate: string, maxDate: string): Promise<string[]> {
  const journalClause = JOURNALS.map((j) => `"${j.nlm}"[Journal]`).join(" OR ");
  const term = `(${journalClause})`;
  // Use the mindate/maxdate + datetype=pdat form (YYYY/MM/DD) for a clean
  // publication-date window; a single day passes the same date for both.
  const min = minDate.replace(/-/g, "/");
  const max = maxDate.replace(/-/g, "/");
  const url =
    `${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&retmax=${RETMAX}` +
    `&datetype=pdat&mindate=${min}&maxdate=${max}` +
    `&term=${encodeURIComponent(term)}`;
  const res = await ncbiFetch(url);
  if (!res.ok) throw new Error(`esearch HTTP ${res.status}`);
  const json = (await res.json()) as {
    esearchresult?: { idlist?: string[]; count?: string };
  };
  return json.esearchresult?.idlist ?? [];
}

// ── efetch ────────────────────────────────────────────────────────────────────

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  textNodeName: "#text",
});

function resolveVenue(journalNode: Record<string, unknown> | undefined): {
  venue: string;
  domain: string;
} | null {
  if (!journalNode) return null;
  const iso = collectText(journalNode["ISOAbbreviation"]).trim().toLowerCase();
  const title = collectText(journalNode["Title"]).trim().toLowerCase();
  const byIso = iso ? VENUE_BY_NLM.get(iso) : undefined;
  if (byIso) return { venue: byIso.venue, domain: byIso.domain };
  const byTitle = title ? VENUE_BY_TITLE.get(title) : undefined;
  if (byTitle) return { venue: byTitle.venue, domain: byTitle.domain };
  return null;
}

function extractDoi(article: Record<string, unknown>, pubmedData: Record<string, unknown> | undefined): string | null {
  // 1) Article/ELocationID with EIdType="doi"
  for (const el of toArray(article["ELocationID"]) as Record<string, unknown>[]) {
    if (el && el["@_EIdType"] === "doi") {
      const doi = collectText(el).trim();
      if (doi) return doi;
    }
  }
  // 2) PubmedData/ArticleIdList/ArticleId with IdType="doi"
  const idList = pubmedData?.["ArticleIdList"] as Record<string, unknown> | undefined;
  for (const id of toArray(idList?.["ArticleId"]) as Record<string, unknown>[]) {
    if (id && id["@_IdType"] === "doi") {
      const doi = collectText(id).trim();
      if (doi) return doi;
    }
  }
  return null;
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function two(s: string): string {
  return s.padStart(2, "0");
}

function monthNum(raw: string): string {
  const t = raw.trim().toLowerCase();
  if (/^\d+$/.test(t)) return two(t);
  const m = MONTHS[t.slice(0, 3)];
  return m ?? "01";
}

/** Best-effort publication date as YYYY-MM-DD. Prefers ArticleDate, then the
 * Journal PubDate (Year/Month/Day or a free-text MedlineDate). Falls back to the
 * window's max date when the record has no usable date. */
function extractDate(
  article: Record<string, unknown>,
  journalIssue: Record<string, unknown> | undefined,
  fallback: string,
): string {
  const artDate = toArray(article["ArticleDate"])[0] as Record<string, unknown> | undefined;
  if (artDate?.["Year"]) {
    const y = collectText(artDate["Year"]).trim();
    const mo = artDate["Month"] ? monthNum(collectText(artDate["Month"])) : "01";
    const d = artDate["Day"] ? two(collectText(artDate["Day"]).trim()) : "01";
    if (/^\d{4}$/.test(y)) return `${y}-${mo}-${d}`;
  }
  const pubDate = journalIssue?.["PubDate"] as Record<string, unknown> | undefined;
  if (pubDate) {
    const y = pubDate["Year"] ? collectText(pubDate["Year"]).trim() : "";
    if (/^\d{4}$/.test(y)) {
      const mo = pubDate["Month"] ? monthNum(collectText(pubDate["Month"])) : "01";
      const d = pubDate["Day"] ? two(collectText(pubDate["Day"]).trim()) : "01";
      return `${y}-${mo}-${d}`;
    }
    // MedlineDate free text like "2026 Jul" or "2026 Jul-Aug"
    const md = pubDate["MedlineDate"] ? collectText(pubDate["MedlineDate"]).trim() : "";
    const ym = md.match(/(\d{4})\s*([A-Za-z]{3})?/);
    if (ym) {
      const mo = ym[2] ? monthNum(ym[2]) : "01";
      return `${ym[1]}-${mo}-01`;
    }
  }
  return fallback;
}

async function efetchBatch(pmids: string[], fallbackDate: string): Promise<FetchedArticle[]> {
  if (pmids.length === 0) return [];
  const url =
    `${EUTILS}/efetch.fcgi?db=pubmed&rettype=abstract&retmode=xml&id=${pmids.join(",")}`;
  const res = await ncbiFetch(url);
  if (!res.ok) throw new Error(`efetch HTTP ${res.status}`);
  const xml = await res.text();
  const parsed = xmlParser.parse(xml);

  const articles = toArray(
    parsed?.PubmedArticleSet?.PubmedArticle,
  ) as Record<string, unknown>[];

  const out: FetchedArticle[] = [];
  for (const pa of articles) {
    const citation = pa["MedlineCitation"] as Record<string, unknown> | undefined;
    const pubmedData = pa["PubmedData"] as Record<string, unknown> | undefined;
    if (!citation) continue;
    const articleNode = citation["Article"] as Record<string, unknown> | undefined;
    if (!articleNode) continue;

    const pmid = collectText(citation["PMID"]).trim();
    if (!pmid) continue;

    const title = collectText(articleNode["ArticleTitle"]).replace(/\s+/g, " ").trim();
    // Abstract may be a single node or several labeled sections — collectText
    // concatenates them. This text is used ONLY for the LLM and never stored.
    const abstractNode = articleNode["Abstract"] as Record<string, unknown> | undefined;
    const abstract = abstractNode
      ? collectText(abstractNode["AbstractText"]).replace(/\s+/g, " ").trim()
      : "";

    const journalNode = articleNode["Journal"] as Record<string, unknown> | undefined;
    const resolved = resolveVenue(journalNode);
    if (!resolved) continue; // not one of our whitelisted journals (or ambiguous)

    const journalIssue = journalNode?.["JournalIssue"] as Record<string, unknown> | undefined;
    const publishedAt = extractDate(articleNode, journalIssue, fallbackDate);
    const doi = extractDoi(articleNode, pubmedData);

    if (!title || abstract.length < 120) continue; // need a real abstract to mine

    out.push({
      pmid,
      title,
      abstract,
      venue: resolved.venue,
      defaultDomain: resolved.domain,
      doi,
      publishedAt,
    });
  }
  return out;
}

// ── LLM fact extraction (COPYRIGHT-CRITICAL) ─────────────────────────────────
//
// COPYRIGHT RULE ENFORCED HERE:
//   The abstract is copyrighted publisher text. The prompt forbids copying or
//   translating any sentence. The model must extract ONE verifiable fact and
//   restate it entirely in its own words. If there is no standalone verifiable
//   fact, it must skip. The abstract is discarded after this call — never stored.

async function extractInsight(article: FetchedArticle): Promise<Insight | null> {
  const domainMenu = DOMAIN_MENU.map((d) => `- "${d.id}": ${d.en} / ${d.zh}`).join("\n");

  const prompt = [
    "You are processing a peer-reviewed journal article for a general-audience fact feed.",
    "",
    "COPYRIGHT RULE (critical): The abstract below is copyrighted text owned by the",
    "publisher. You MUST NOT copy, quote, paraphrase closely, or translate any of its",
    "sentences. You must extract the single most surprising VERIFIABLE FACT (a finding,",
    "a number, an effect size, a mechanism) and restate it ENTIRELY in your own words.",
    "Retaining the abstract's wording or structure is forbidden.",
    "",
    "Instructions:",
    '1) "hook": ONE verifiable fact restated in your own words. Plain spoken English,',
    "   ≤100 characters. State the FACT ITSELF (a specific number, effect, comparison),",
    "   never describe the study: phrasing like \"this study/research/trial shows...\" is",
    "   FORBIDDEN. No exclamation marks. No em-dash or en-dash (— or –); use a comma.",
    "   No template openers (Did you know / Scientists found / New research / Researchers).",
    "   Deadpan. End with a period.",
    '2) "hookZh": Same fact in Chinese, ≤40 characters. 口语通俗，事实本身开头，严禁描述论文',
    "   （“该研究/这项研究/这个方法……”一律不合格）。数字优先，语气克制，禁止感叹号，",
    "   禁用破折号（——、—、―），用逗号或句号收尾。禁用套路开头（你知道吗/最新研究/科学家发现）。",
    '3) "plainSummary": 2-3 sentence plain-English explanation for a curious 14-year-old,',
    "   in your OWN words (do not copy the abstract).",
    '4) "plainSummaryZh": Same in Chinese, 2-3 sentences, your own words.',
    '5) "domain": classify the fact into EXACTLY ONE of these taxonomy domain ids',
    "   (pick the single best fit for the FACT; a default is suggested but override it",
    "   if another domain fits the fact better):",
    domainMenu,
    `   Suggested default for this journal: "${article.defaultDomain}".`,
    "",
    "SKIP RULE: If the abstract has no standalone verifiable fact that can be stated",
    "without copying its wording (e.g. it is a pure methods/protocol/editorial piece,",
    'or only a vague claim), return {"skip": true}.',
    "",
    "GOOD hook: \"A daily low dose cut heart-attack deaths by 23% in the trial group.\"",
    "BAD hook: \"This study investigates cardiovascular outcomes of aspirin therapy.\"",
    'GOOD hookZh: "每天一小片阿司匹林，让试验组心梗死亡率降了两成三。"',
    'BAD hookZh: "该研究探讨了阿司匹林对心血管的影响。"',
    "",
    "Article title (metadata, safe to read): " + article.title,
    "Journal: " + article.venue,
    "Abstract (COPYRIGHTED source text — read only, do NOT copy or translate):",
    article.abstract,
    "",
    'Return strict JSON: {"hook":"...","hookZh":"...","plainSummary":"...","plainSummaryZh":"...","domain":"..."}',
    'OR if no standalone fact: {"skip": true}',
  ].join("\n");

  const tryOnce = async () => {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.7,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract verifiable facts from biomedical/science abstracts and restate them entirely in your own words. Never copy the source text. Output JSON only.",
        },
        { role: "user", content: prompt },
      ],
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as {
      skip?: boolean;
      hook?: string;
      hookZh?: string;
      plainSummary?: string;
      plainSummaryZh?: string;
      domain?: string;
    };
  };

  const build = (r: Awaited<ReturnType<typeof tryOnce>>): Insight => {
    const domain =
      r.domain && VALID_DOMAIN_IDS.has(r.domain) ? r.domain : article.defaultDomain;
    return {
      hook: normalizeHook(r.hook ?? article.title),
      hookZh: r.hookZh?.trim() ?? "",
      plainSummary: r.plainSummary?.trim() ?? "",
      plainSummaryZh: r.plainSummaryZh?.trim() ?? "",
      domain,
    };
  };

  const first = await tryOnce();
  if (first.skip) return null;
  const i1 = build(first);

  if (META_HOOK_PATTERN.test(i1.hookZh) || META_HOOK_PATTERN.test(i1.hook)) {
    const second = await tryOnce();
    if (second.skip) return null;
    const i2 = build(second);
    const clean = !META_HOOK_PATTERN.test(i2.hookZh) && !META_HOOK_PATTERN.test(i2.hook);
    return clean ? i2 : i1;
  }
  return i1;
}

// ── concurrency pool (≤3 for LLM) ────────────────────────────────────────────

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ── supabase ──────────────────────────────────────────────────────────────────

async function fetchExistingPmids(pmids: string[]): Promise<Set<string>> {
  if (pmids.length === 0) return new Set();
  const existing = new Set<string>();
  for (let i = 0; i < pmids.length; i += 200) {
    const chunk = pmids.slice(i, i + 200);
    const { data } = await supabase
      .from("papers")
      .select("source_id")
      .eq("source", "pubmed")
      .in("source_id", chunk);
    for (const row of data ?? []) existing.add(row.source_id as string);
  }
  return existing;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dateArg = args.find((a) => a.startsWith("--date="))?.slice(7);
  const daysArg = args.find((a) => a.startsWith("--days="))?.slice(7);

  const now = new Date();

  let minDate: string;
  let maxDate: string;
  if (dateArg) {
    minDate = maxDate = dateArg;
  } else if (daysArg) {
    const n = Math.max(1, parseInt(daysArg, 10) || 1);
    maxDate = ymd(now);
    const start = new Date(now);
    start.setDate(start.getDate() - (n - 1));
    minDate = ymd(start);
  } else {
    // default: rolling lookback (see DEFAULT_LOOKBACK_DAYS above) — NOT just
    // yesterday. PDAT indexing lag means a single-day window silently and
    // permanently drops articles that weren't indexed yet at run time.
    ({ startDate: minDate, endDate: maxDate } = rollingLookbackWindow(now, DEFAULT_LOOKBACK_DAYS));
  }

  console.log(
    `[pubmed] mode: PDAT ${minDate}${minDate === maxDate ? "" : ` → ${maxDate}`}` +
      ` | api_key: ${NCBI_API_KEY ? "yes (10 req/s)" : "no (3 req/s)"}`,
  );
  console.log(`[pubmed] whitelist: ${JOURNALS.length} journals`);

  // 1. esearch
  const pmids = await esearchPmids(minDate, maxDate);
  console.log(`[pubmed] esearch: ${pmids.length} PMIDs`);
  if (pmids.length === 0) {
    console.log("[pubmed] nothing to do.");
    return;
  }

  // 2. idempotency — drop PMIDs already in DB before spending any fetch/LLM
  const existing = await fetchExistingPmids(pmids);
  const freshPmids = pmids.filter((p) => !existing.has(p));
  console.log(
    `[pubmed] already in db: ${existing.size} | new to process: ${freshPmids.length}`,
  );
  if (freshPmids.length === 0) {
    console.log("[pubmed] all PMIDs already present — 0 new.");
    return;
  }

  // 3. efetch (batches ≤100)
  const articles: FetchedArticle[] = [];
  for (let i = 0; i < freshPmids.length; i += 100) {
    const batch = freshPmids.slice(i, i + 100);
    const fetched = await efetchBatch(batch, maxDate);
    articles.push(...fetched);
  }
  console.log(`[pubmed] efetch: ${articles.length} articles with usable abstract + whitelisted venue`);

  // Bound LLM cost: process at most MAX_EXTRACT (most recent first).
  const toExtract = articles
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, MAX_EXTRACT);
  if (toExtract.length < articles.length) {
    console.log(`[pubmed] capping extraction at ${MAX_EXTRACT} (of ${articles.length})`);
  }

  // 4. LLM fact extraction (concurrency ≤3)
  let nullFact = 0;
  const insights = await mapPool(toExtract, LLM_CONCURRENCY, async (art) => {
    try {
      const insight = await extractInsight(art);
      return insight;
    } catch (err) {
      console.error(`  [LLM FAIL] PMID ${art.pmid}: ${(err as Error).message}`);
      return null;
    }
  });

  const candidates: Candidate[] = [];
  for (let i = 0; i < toExtract.length; i++) {
    const ins = insights[i];
    if (!ins) {
      nullFact += 1;
      continue;
    }
    candidates.push({ ...toExtract[i], insight: ins });
  }
  console.log(`[pubmed] extracted: ${candidates.length} | skipped (no standalone fact): ${nullFact}`);

  // 5. Relevance scoring (batched) + rank by hook_strength, keep top DAILY_CAP
  const relevanceMap = await generateRelevance(
    candidates.map((c) => ({
      id: c.pmid,
      title: c.title,
      hook_summary_en: c.insight.hook,
      hook_summary_zh: c.insight.hookZh,
    })),
    openai,
    OPENAI_MODEL,
    { timelinessHint: "recent" },
  );

  const ranked = candidates
    .map((c) => ({ c, strength: relevanceMap.get(c.pmid)?.hook_strength ?? 0.5 }))
    .sort((a, b) => b.strength - a.strength);

  // Keep top DAILY_CAP by strength, but no more than PER_VENUE_CAP from any one
  // journal so a high-volume venue (PNAS) can't crowd out the prestige spread.
  const perVenue = new Map<string, number>();
  const kept: typeof ranked = [];
  for (const entry of ranked) {
    if (kept.length >= DAILY_CAP) break;
    const n = perVenue.get(entry.c.venue) ?? 0;
    if (n >= PER_VENUE_CAP) continue;
    perVenue.set(entry.c.venue, n + 1);
    kept.push(entry);
  }
  const dropped = ranked.length - kept.length;
  if (dropped > 0) {
    console.log(`[pubmed] daily cap: keeping top ${kept.length} by hook_strength, dropping ${dropped}`);
  }

  // 6. Upsert
  let inserted = 0;
  const perDomain: Record<string, number> = {};
  const perJournal: Record<string, number> = {};
  const samples: Array<{ zh: string; venue: string; domain: string }> = [];

  for (const { c } of kept) {
    const rel = relevanceMap.get(c.pmid);
    const relevanceRecord = rel
      ? { ...rel, structure: scoreStructure(c.insight.hook, c.insight.hookZh), scored_at: new Date().toISOString() }
      : undefined;

    const absUrl = c.doi
      ? `https://doi.org/${c.doi}`
      : `https://pubmed.ncbi.nlm.nih.gov/${c.pmid}/`;
    const publishedIso = new Date(`${c.publishedAt}T00:00:00Z`).toISOString();

    const payload = {
      source: "pubmed",
      source_id: c.pmid,
      arxiv_id_base: `pubmed-${c.pmid}`,
      arxiv_id_version: 1,
      title: c.title,
      // COPYRIGHT: the `abstract` column stores the LLM's OWN restated summary,
      // NOT the copyrighted source abstract. The source abstract is never stored.
      abstract: c.insight.plainSummary || c.title,
      hook_summary_en: c.insight.hook,
      hook_summary_zh: c.insight.hookZh,
      plain_summary_en: c.insight.plainSummary,
      plain_summary_zh: c.insight.plainSummaryZh,
      tags: [c.insight.domain, "pubmed"],
      human_category: c.insight.domain,
      authors: [],
      primary_category: `pubmed:${c.insight.domain}`,
      categories: [c.insight.domain],
      published_at: publishedIso,
      source_updated_at: publishedIso,
      pdf_url: null,
      abs_url: absUrl,
      metadata: {
        source: "pubmed",
        venue: c.venue,
        pmid: c.pmid,
        ...(c.doi ? { doi: c.doi } : {}),
        ...(relevanceRecord ? { relevance: relevanceRecord } : {}),
      },
    };

    const { error } = await supabase
      .from("papers")
      .upsert(payload, { onConflict: "arxiv_id_base" });
    if (error) {
      console.error(`  [FAIL] PMID ${c.pmid}: ${error.message}`);
      continue;
    }

    inserted += 1;
    perDomain[c.insight.domain] = (perDomain[c.insight.domain] ?? 0) + 1;
    perJournal[c.venue] = (perJournal[c.venue] ?? 0) + 1;
    if (samples.length < 6 && c.insight.hookZh) {
      samples.push({ zh: c.insight.hookZh, venue: c.venue, domain: c.insight.domain });
    }
    console.log(`  [OK ${inserted}] PMID ${c.pmid} | ${c.venue} → ${c.insight.domain} | ${c.insight.hookZh.slice(0, 34)}`);
  }

  console.log("\n[pubmed] === SUMMARY ===");
  console.log(`  PMIDs found (esearch):     ${pmids.length}`);
  console.log(`  new (not in db):           ${freshPmids.length}`);
  console.log(`  articles fetched:          ${articles.length}`);
  console.log(`  extracted (has fact):      ${candidates.length}`);
  console.log(`  skipped (no fact):         ${nullFact}`);
  console.log(`  dropped by daily cap:      ${dropped}`);
  console.log(`  inserted:                  ${inserted}`);
  console.log("  by domain:");
  for (const [d, n] of Object.entries(perDomain).sort()) console.log(`    ${d}: ${n}`);
  console.log("  by journal:");
  for (const [v, n] of Object.entries(perJournal).sort()) console.log(`    ${v}: ${n}`);
  console.log("\n[pubmed] sample zh hooks (venue | v5 check: fact-first, deadpan, no ! no dash):");
  for (const s of samples) {
    console.log(`  - [${s.domain} | ${s.venue}] ${s.zh}`);
    if (/[!！]|[—―–]/.test(s.zh)) console.warn(`    ⚠ dash/exclamation detected`);
  }
}

main().catch((err) => {
  console.error("ingest-pubmed crashed:", err);
  process.exit(1);
});
