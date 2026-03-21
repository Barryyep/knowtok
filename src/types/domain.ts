export type DomainKey = "cs" | "physics" | "math" | "q-bio" | "q-fin" | "econ" | "astro-ph";

export type HumanCategory = "AI & Robots" | "Your Health" | "Your Money" | "Your Food" | "Climate";

export interface PaperCard {
  id: string;
  arxivIdBase: string;
  arxivIdVersion: number;
  title: string;
  hookSummaryEn: string;
  hookSummaryZh: string;
  personalizedHook: string;
  plainSummary: string;
  plainSummaryZh: string;
  humanCategory: string;
  tags: string[];
  primaryCategory: string;
  categories: string[];
  publishedAt: string;
  absUrl: string;
  pdfUrl: string | null;
  saved: boolean;
}

export interface PaperDetail extends PaperCard {
  abstract: string;
  authors: string[];
  sourceUpdatedAt: string;
  metadata: Record<string, unknown>;
}

export type PaperDetailPartial = Pick<PaperDetail, "abstract" | "authors">;

export interface UserPersona {
  userId: string;
  jobTitle: string | null;
  industry: string | null;
  skills: string[];
  interests: string[];
  manualNotes: string | null;
  profileSource: "manual" | "resume" | "mixed";
  location: string | null;
  ageRange: string | null;
  curiosityTags: string[];
  language: "en" | "zh";
  createdAt: string;
  updatedAt: string;
}

export interface ImpactBrief {
  text: string;
  cached: boolean;
  updatedAt: string;
}

export interface FeedCursor {
  offset: number;
}

export interface IngestRunResult {
  runId: string;
  status: "success" | "partial" | "failed";
  fetchedCount: number;
  upsertedCount: number;
  unchangedCount: number;
  llmFailedCount: number;
  skippedCount: number;
  fetchFailedDomains: number;
  startedAt: string;
  endedAt: string;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
}
