import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { getAuthedClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { client, user } = await getAuthedClient(request);

    const { data, error } = await client
      .from("user_saved_papers")
      .select(
        "paper_id, created_at, papers!inner(id, arxiv_id_base, arxiv_id_version, title, hook_summary_en, tags, primary_category, categories, published_at, abs_url, pdf_url)",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const items = ((data as Array<Record<string, unknown>> | null) ?? []).map((row) => {
      const paper = row.papers as Record<string, unknown>;
      return {
        id: String(paper.id),
        arxivIdBase: String(paper.arxiv_id_base),
        arxivIdVersion: Number(paper.arxiv_id_version ?? 1),
        title: String(paper.title ?? "Untitled"),
        hookSummaryEn: String(paper.hook_summary_en ?? ""),
        tags: (paper.tags as string[] | null) ?? [],
        primaryCategory: String(paper.primary_category ?? ""),
        categories: (paper.categories as string[] | null) ?? [],
        publishedAt: String(paper.published_at ?? new Date(0).toISOString()),
        absUrl: String(paper.abs_url ?? ""),
        pdfUrl: (paper.pdf_url as string | null) ?? null,
        saved: true,
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    return jsonError(error, "Failed to fetch saved papers");
  }
}
