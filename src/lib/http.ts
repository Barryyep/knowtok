import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/lib/supabase/server";

type ErrorLike = {
  message?: unknown;
  code?: unknown;
  status?: unknown;
};

function asErrorLike(error: unknown): ErrorLike | null {
  if (!error || typeof error !== "object") {
    return null;
  }
  return error as ErrorLike;
}

function missingSchemaResponse() {
  return NextResponse.json(
    {
      error:
        "Database schema is missing or outdated. Run supabase/migrations/20260213_001_web_mvp_schema.sql in Supabase SQL Editor.",
    },
    { status: 500 },
  );
}

function missingBucketResponse() {
  return NextResponse.json(
    {
      error:
        "Storage bucket `resumes` does not exist. Run supabase/migrations/20260213_001_web_mvp_schema.sql (or create bucket `resumes`) and retry.",
    },
    { status: 503 },
  );
}

export function jsonError(error: unknown, fallbackMessage = "Request failed") {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const errorLike = asErrorLike(error);
  const message = typeof errorLike?.message === "string" ? errorLike.message : "";
  const code = typeof errorLike?.code === "string" ? errorLike.code : "";
  const rawStatus = typeof errorLike?.status === "number" ? errorLike.status : 500;
  const status = rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;

  if (code === "42P01" || /relation .* does not exist/i.test(message)) {
    return missingSchemaResponse();
  }

  if (/bucket not found/i.test(message)) {
    return missingBucketResponse();
  }

  if (error instanceof Error) {
    return NextResponse.json({ error: error.message || fallbackMessage }, { status });
  }

  if (message) {
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
