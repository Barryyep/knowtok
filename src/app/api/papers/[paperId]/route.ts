import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getAuthedClient } from "@/lib/supabase/server";

function mapPaperDetail(row: Record<string, unknown>, saved: boolean) {
  return {
    id: String(row.id),
    arxivIdBase: String(row.arxiv_id_base),
    arxivIdVersion: Number(row.arxiv_id_version ?? 1),
    title: String(row.title ?? "Untitled"),
    hookSummaryEn: String(row.hook_summary_en ?? ""),
    hookSummaryZh: String(row.hook_summary_zh ?? ""),
    plainSummary: String(row.plain_summary_en ?? ""),
    plainSummaryZh: String(row.plain_summary_zh ?? ""),
    humanCategory: String(row.human_category ?? "AI & Robots"),
    personalizedHook: String(row.hook_summary_en ?? ""),
    tags: (row.tags as string[] | null) ?? [],
    primaryCategory: String(row.primary_category ?? ""),
    categories: (row.categories as string[] | null) ?? [],
    publishedAt: String(row.published_at ?? new Date(0).toISOString()),
    sourceUpdatedAt: String(row.source_updated_at ?? new Date(0).toISOString()),
    absUrl: String(row.abs_url ?? ""),
    pdfUrl: (row.pdf_url as string | null) ?? null,
    abstract: String(row.abstract ?? ""),
    authors: (row.authors as string[] | null) ?? [],
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    saved,
  };
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{ paperId: string }>;
  },
) {
  try {
    const { client, user } = await getAuthedClient(request);
    const { paperId } = await context.params;

    const [paperResult, savedResult] = await Promise.all([
      client.from("papers").select("*").eq("id", paperId).maybeSingle(),
      client
        .from("user_saved_papers")
        .select("paper_id")
        .eq("user_id", user.id)
        .eq("paper_id", paperId)
        .maybeSingle(),
    ]);

    if (paperResult.error) {
      throw paperResult.error;
    }
    if (savedResult.error && savedResult.error.code !== "PGRST116") {
      throw savedResult.error;
    }

    if (!paperResult.data) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    return NextResponse.json({
      paper: mapPaperDetail(paperResult.data as Record<string, unknown>, Boolean(savedResult.data?.paper_id)),
    });
  } catch (error) {
    return jsonError(error, "Failed to fetch paper");
  }
}
