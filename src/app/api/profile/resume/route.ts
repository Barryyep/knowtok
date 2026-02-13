import { NextResponse } from "next/server";
import { parseResume } from "@/lib/resume-parse";
import { badRequest, jsonError } from "@/lib/http";
import { getAuthedClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024;

type ResumeKind = "pdf" | "docx";

function inferResumeKind(file: File): ResumeKind | null {
  const fileName = file.name.toLowerCase();
  if (file.type.includes("pdf") || fileName.endsWith(".pdf")) {
    return "pdf";
  }
  if (
    file.type.includes("wordprocessingml") ||
    file.type.includes("msword") ||
    fileName.endsWith(".docx")
  ) {
    return "docx";
  }
  return null;
}

function pickProfileSource(hasManual: boolean): "manual" | "resume" | "mixed" {
  if (hasManual) {
    return "mixed";
  }
  return "resume";
}

function mergePersona(options: {
  existing: Record<string, unknown> | null;
  parsed: {
    jobTitle: string | null;
    industry: string | null;
    skills: string[];
    interests: string[];
  };
}) {
  const existingJobTitle = (options.existing?.job_title as string | null) ?? null;
  const existingIndustry = (options.existing?.industry as string | null) ?? null;
  const existingSkills = ((options.existing?.skills as string[] | null) ?? []).filter(Boolean);
  const existingInterests = ((options.existing?.interests as string[] | null) ?? []).filter(Boolean);
  const manualNotes = (options.existing?.manual_notes as string | null) ?? null;

  const mergedSkills = existingSkills.length > 0 ? existingSkills : options.parsed.skills;
  const mergedInterests = existingInterests.length > 0 ? existingInterests : options.parsed.interests;

  const hasManual = Boolean(
    existingJobTitle || existingIndustry || existingSkills.length || existingInterests.length || manualNotes,
  );

  return {
    jobTitle: existingJobTitle || options.parsed.jobTitle,
    industry: existingIndustry || options.parsed.industry,
    skills: Array.from(new Set(mergedSkills)).slice(0, 25),
    interests: Array.from(new Set(mergedInterests)).slice(0, 25),
    manualNotes,
    profileSource: pickProfileSource(hasManual),
  };
}

export async function POST(request: Request) {
  try {
    const { client, user } = await getAuthedClient(request);
    const form = await request.formData();
    const resume = form.get("resume");

    if (!(resume instanceof File)) {
      return badRequest("Missing resume file");
    }

    if (resume.size > MAX_RESUME_SIZE_BYTES) {
      return badRequest("Resume file exceeds 10MB limit");
    }

    const resumeKind = inferResumeKind(resume);
    if (!resumeKind) {
      return badRequest("Unsupported file type. Upload PDF or DOCX.");
    }

    const fileBuffer = Buffer.from(await resume.arrayBuffer());
    const parsed = await parseResume(fileBuffer, resumeKind);

    const storagePath = `${user.id}/resume.${resumeKind}`;

    const { error: uploadError } = await client.storage
      .from("resumes")
      .upload(storagePath, fileBuffer, {
        contentType:
          resumeKind === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: existingPersona, error: existingPersonaError } = await client
      .from("user_personas")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingPersonaError && existingPersonaError.code !== "PGRST116") {
      throw existingPersonaError;
    }

    const mergedPersona = mergePersona({
      existing: (existingPersona as Record<string, unknown> | null) ?? null,
      parsed,
    });

    const [personaResult, resumeResult] = await Promise.all([
      client.from("user_personas").upsert(
        {
          user_id: user.id,
          job_title: mergedPersona.jobTitle,
          industry: mergedPersona.industry,
          skills: mergedPersona.skills,
          interests: mergedPersona.interests,
          manual_notes: mergedPersona.manualNotes,
          profile_source: mergedPersona.profileSource,
        },
        { onConflict: "user_id" },
      ),
      client.from("user_resumes").upsert(
        {
          user_id: user.id,
          storage_path: storagePath,
          file_name: resume.name,
          file_type: resumeKind,
          file_size_bytes: resume.size,
          extracted_text: parsed.extractedText,
          parser_status: "parsed",
        },
        { onConflict: "user_id" },
      ),
    ]);

    if (personaResult.error) {
      throw personaResult.error;
    }
    if (resumeResult.error) {
      throw resumeResult.error;
    }

    return NextResponse.json({
      persona: {
        userId: user.id,
        jobTitle: mergedPersona.jobTitle,
        industry: mergedPersona.industry,
        skills: mergedPersona.skills,
        interests: mergedPersona.interests,
        manualNotes: mergedPersona.manualNotes,
        profileSource: mergedPersona.profileSource,
      },
      resumeStatus: "parsed",
    });
  } catch (error) {
    return jsonError(error, "Failed to upload resume");
  }
}
