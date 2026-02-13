export type DomainKey = "cs" | "physics" | "math";

export interface PaperCard {
  id: string;
  arxivIdBase: string;
  arxivIdVersion: number;
  title: string;
  hookSummaryEn: string;
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

export interface UserPersona {
  userId: string;
  jobTitle: string | null;
  industry: string | null;
  skills: string[];
  interests: string[];
  manualNotes: string | null;
  profileSource: "manual" | "resume" | "mixed";
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
  llmFailedCount: number;
  skippedCount: number;
  startedAt: string;
  endedAt: string;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
}
