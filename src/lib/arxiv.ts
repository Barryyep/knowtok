import { XMLParser } from "fast-xml-parser";
import type { DomainKey } from "@/types/domain";

export interface ArxivPaper {
  arxivIdBase: string;
  arxivIdVersion: number;
  title: string;
  abstract: string;
  authors: string[];
  primaryCategory: string;
  categories: string[];
  publishedAt: string;
  sourceUpdatedAt: string;
  absUrl: string;
  pdfUrl: string | null;
  metadata: Record<string, unknown>;
}

const ARXIV_API_URL = "https://export.arxiv.org/api/query";

function toArray<T>(input: T | T[] | undefined): T[] {
  if (!input) return [];
  return Array.isArray(input) ? input : [input];
}

export function parseArxivIdentifier(rawId: string): {
  base: string;
  version: number;
} {
  const candidate = rawId.includes("/abs/") ? rawId.split("/abs/").at(-1) || rawId : rawId;
  const clean = candidate.replace(/\?.*$/, "").trim();
  const match = clean.match(/^(.+?)(?:v(\d+))?$/i);

  if (!match) {
    return { base: clean, version: 1 };
  }

  return {
    base: match[1],
    version: Number.parseInt(match[2] || "1", 10),
  };
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function domainQuery(domain: DomainKey) {
  return `cat:${domain}.*`;
}

function findPdfUrl(links: Array<Record<string, string>>): string | null {
  const exact = links.find((link) => link.title === "pdf" || link.type === "application/pdf");
  if (exact?.href) return exact.href;

  const fallback = links.find((link) => link.href?.includes("/pdf/"));
  return fallback?.href ?? null;
}

export async function fetchArxivPapers(options: {
  domain: DomainKey;
  maxResults: number;
  since?: Date;
}): Promise<ArxivPaper[]> {
  const params = new URLSearchParams({
    search_query: domainQuery(options.domain),
    start: "0",
    max_results: String(options.maxResults),
    sortBy: "submittedDate",
    sortOrder: "descending",
  });

  const response = await fetch(`${ARXIV_API_URL}?${params.toString()}`, {
    headers: {
      "User-Agent": "KnowTok/0.1 (arXiv ingestion)",
    },
  });

  if (!response.ok) {
    throw new Error(`arXiv API request failed with status ${response.status}`);
  }

  const xml = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    trimValues: true,
  });

  const parsed = parser.parse(xml);
  const entries = toArray(parsed?.feed?.entry);

  return entries
    .map((entry) => {
      const id = String(entry.id || "");
      const { base, version } = parseArxivIdentifier(id);
      const title = normalizeWhitespace(String(entry.title || "Untitled"));
      const abstract = normalizeWhitespace(String(entry.summary || ""));
      const authors = toArray(entry.author).map((author) => normalizeWhitespace(String(author?.name || "Unknown")));

      const primaryCategory = String(entry["arxiv:primary_category"]?.term || "");
      const categories = toArray(entry.category)
        .map((category) => String(category?.term || "").trim())
        .filter(Boolean);

      const links = toArray(entry.link).map((link) => ({
        href: String(link?.href || ""),
        title: String(link?.title || ""),
        type: String(link?.type || ""),
        rel: String(link?.rel || ""),
      }));

      const publishedAt = new Date(String(entry.published || Date.now())).toISOString();
      const sourceUpdatedAt = new Date(String(entry.updated || Date.now())).toISOString();

      return {
        arxivIdBase: base,
        arxivIdVersion: version,
        title,
        abstract,
        authors,
        primaryCategory,
        categories,
        publishedAt,
        sourceUpdatedAt,
        absUrl: id,
        pdfUrl: findPdfUrl(links),
        metadata: {
          domain: options.domain,
          links,
        },
      } satisfies ArxivPaper;
    })
    .filter((paper) => {
      if (!options.since) {
        return true;
      }

      return new Date(paper.publishedAt) >= options.since;
    });
}
