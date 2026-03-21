import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, badRequest } from "@/lib/http";
import { isOnboardingComplete } from "@/lib/profile";
import { getAuthedClient } from "@/lib/supabase/server";

const payloadSchema = z.object({
  jobTitle: z.string().trim().max(140).nullable().optional(),
  industry: z.string().trim().max(140).nullable().optional(),
  skills: z.array(z.string().trim().max(60)).max(25).optional(),
  interests: z.array(z.string().trim().max(60)).max(25).optional(),
  manualNotes: z.string().trim().max(1200).nullable().optional(),
  location: z.string().trim().max(140).nullable().optional(),
  ageRange: z.string().trim().max(20).nullable().optional(),
  curiosityTags: z.array(z.string().trim().max(30)).max(10).optional(),
});

function uniq(values: string[] | undefined): string[] {
  if (!values) return [];
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function mapPersonaRow(row: Record<string, unknown> | null, userId: string) {
  if (!row) {
    return {
      userId,
      jobTitle: null,
      industry: null,
      skills: [] as string[],
      interests: [] as string[],
      manualNotes: null,
      location: null,
      ageRange: null,
      curiosityTags: [] as string[],
      profileSource: "manual",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    };
  }

  return {
    userId,
    jobTitle: (row.job_title as string | null) ?? null,
    industry: (row.industry as string | null) ?? null,
    skills: (row.skills as string[] | null) ?? [],
    interests: (row.interests as string[] | null) ?? [],
    manualNotes: (row.manual_notes as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    ageRange: (row.age_range as string | null) ?? null,
    curiosityTags: (row.curiosity_tags as string[] | null) ?? [],
    profileSource: ((row.profile_source as string | null) ?? "manual") as "manual" | "resume" | "mixed",
    createdAt: (row.created_at as string) || new Date(0).toISOString(),
    updatedAt: (row.updated_at as string) || new Date(0).toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    const { client, user } = await getAuthedClient(request);

    const [personaResult, resumeResult] = await Promise.all([
      client.from("user_personas").select("*").eq("user_id", user.id).maybeSingle(),
      client.from("user_resumes").select("user_id, updated_at").eq("user_id", user.id).maybeSingle(),
    ]);

    if (personaResult.error) {
      throw personaResult.error;
    }
    if (resumeResult.error && resumeResult.error.code !== "PGRST116") {
      throw resumeResult.error;
    }

    const persona = mapPersonaRow(personaResult.data as Record<string, unknown> | null, user.id);
    const hasResume = Boolean(resumeResult.data?.user_id);

    return NextResponse.json({
      persona,
      resume: hasResume
        ? {
            hasResume: true,
            updatedAt: resumeResult.data?.updated_at ?? null,
          }
        : {
            hasResume: false,
            updatedAt: null,
          },
      onboardingComplete: isOnboardingComplete({
        jobTitle: persona.jobTitle,
        industry: persona.industry,
        skills: persona.skills,
        interests: persona.interests,
        manualNotes: persona.manualNotes,
        curiosityTags: persona.curiosityTags,
        hasResume,
      }),
    });
  } catch (error) {
    return jsonError(error, "Failed to fetch profile");
  }
}

export async function PUT(request: Request) {
  try {
    const { client, user } = await getAuthedClient(request);
    const body = await request.json();
    const parsed = payloadSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message || "Invalid profile payload");
    }

    const payload = parsed.data;

    const { data: existingResume, error: resumeError } = await client
      .from("user_resumes")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (resumeError && resumeError.code !== "PGRST116") {
      throw resumeError;
    }

    const profileSource = existingResume?.user_id ? "mixed" : "manual";

    const { error: upsertError } = await client.from("user_personas").upsert(
      {
        user_id: user.id,
        job_title: payload.jobTitle ?? null,
        industry: payload.industry ?? null,
        skills: uniq(payload.skills),
        interests: uniq(payload.interests),
        manual_notes: payload.manualNotes ?? null,
        location: payload.location ?? null,
        age_range: payload.ageRange ?? null,
        curiosity_tags: uniq(payload.curiosityTags),
        profile_source: profileSource,
      },
      { onConflict: "user_id" },
    );

    if (upsertError) {
      throw upsertError;
    }

    const { data: personaRow, error: personaError } = await client
      .from("user_personas")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (personaError) {
      throw personaError;
    }

    const persona = mapPersonaRow(personaRow as Record<string, unknown>, user.id);

    return NextResponse.json({ persona });
  } catch (error) {
    return jsonError(error, "Failed to update profile");
  }
}
