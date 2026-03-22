import { NextResponse } from "next/server";
import { z } from "zod";
import { IMPACT_PROMPT_VERSION } from "@/lib/constants";
import { badRequest, jsonError } from "@/lib/http";
import { buildFallbackImpact, generateImpactBrief } from "@/lib/llm";
import { composePersonaSummary } from "@/lib/persona-summary";
import { getAuthedClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  refresh: z.boolean().optional(),
  language: z.enum(["en", "zh"]).optional(),
});

export async function POST(
  request: Request,
  context: {
    params: Promise<{ paperId: string }>;
  },
) {
  try {
    const { client, user } = await getAuthedClient(request);
    const { paperId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return badRequest("Invalid impact payload");
    }

    const refresh = Boolean(parsed.data.refresh);

    // Fetch user language first — needed for cache check
    const { data: personaData, error: personaError } = await client
      .from("user_personas")
      .select("job_title, industry, skills, interests, manual_notes, location, age_range, language")
      .eq("user_id", user.id)
      .maybeSingle();

    if (personaError && personaError.code !== "PGRST116") {
      throw personaError;
    }

    // Prefer language from request body (reflects current UI), fall back to DB
    const userLanguage = (parsed.data.language || (personaData?.language as string | null) || "zh") as "en" | "zh";

    if (!refresh) {
      const { data: existingImpact, error: existingImpactError } = await client
        .from("user_paper_impacts")
        .select("impact_text_en, language, updated_at")
        .eq("user_id", user.id)
        .eq("paper_id", paperId)
        .maybeSingle();

      if (existingImpactError && existingImpactError.code !== "PGRST116") {
        throw existingImpactError;
      }

      if (existingImpact?.impact_text_en) {
        const cachedLang = (existingImpact.language as string | null) ?? "en";

        if (cachedLang === userLanguage) {
          await client.from("user_events").insert({
            user_id: user.id,
            paper_id: paperId,
            event_type: "impact_click",
            metadata: { cached: true },
          });

          return NextResponse.json({
            text: existingImpact.impact_text_en,
            cached: true,
            updatedAt: existingImpact.updated_at,
          });
        }
        // Language mismatch — fall through to regenerate
      }
    }

    const [paperResult, resumeResult] = await Promise.all([
      client
        .from("papers")
        .select("title, hook_summary_en, abstract, tags")
        .eq("id", paperId)
        .maybeSingle(),
      client
        .from("user_resumes")
        .select("extracted_text")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (paperResult.error) {
      throw paperResult.error;
    }
    if (resumeResult.error && resumeResult.error.code !== "PGRST116") {
      throw resumeResult.error;
    }

    const paper = paperResult.data;
    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    const personaSummary = composePersonaSummary({
      jobTitle: (personaData?.job_title as string | null) ?? null,
      industry: (personaData?.industry as string | null) ?? null,
      skills: (personaData?.skills as string[] | null) ?? null,
      interests: (personaData?.interests as string[] | null) ?? null,
      manualNotes: (personaData?.manual_notes as string | null) ?? null,
      resumeText: (resumeResult.data?.extracted_text as string | null) ?? null,
      location: (personaData?.location as string | null) ?? null,
      ageRange: (personaData?.age_range as string | null) ?? null,
    });

    let impactText = "";
    let model = "fallback";
    let tokenInput = 0;
    let tokenOutput = 0;
    const start = Date.now();

    try {
      const llm = await generateImpactBrief({
        title: String(paper.title),
        hookSummaryEn: String(paper.hook_summary_en || ""),
        abstract: String(paper.abstract || ""),
        tags: (paper.tags as string[] | null) ?? [],
        personaSummary,
        language: userLanguage,
      });
      impactText = llm.text;
      model = llm.model;
      tokenInput = llm.tokenInput;
      tokenOutput = llm.tokenOutput;
    } catch (llmError) {
      console.error("[impact] LLM failed:", llmError);
      impactText = buildFallbackImpact({
        title: String(paper.title),
        tags: (paper.tags as string[] | null) ?? [],
      });
    }

    const latency = Date.now() - start;

    const { error: upsertError } = await client.from("user_paper_impacts").upsert(
      {
        user_id: user.id,
        paper_id: paperId,
        impact_text_en: impactText,
        language: userLanguage,
        model,
        prompt_version: IMPACT_PROMPT_VERSION,
        latency_ms: latency,
        token_input: tokenInput,
        token_output: tokenOutput,
      },
      { onConflict: "user_id,paper_id" },
    );

    if (upsertError) {
      throw upsertError;
    }

    await client.from("user_events").insert({
      user_id: user.id,
      paper_id: paperId,
      event_type: refresh ? "impact_refresh" : "impact_click",
      metadata: {
        cached: false,
        degraded: model === "fallback",
      },
    });

    const { data: updatedImpact, error: readError } = await client
      .from("user_paper_impacts")
      .select("updated_at")
      .eq("user_id", user.id)
      .eq("paper_id", paperId)
      .single();

    if (readError) {
      throw readError;
    }

    return NextResponse.json({
      text: impactText,
      cached: false,
      updatedAt: updatedImpact.updated_at,
    });
  } catch (error) {
    return jsonError(error, "Failed to generate impact insight");
  }
}
