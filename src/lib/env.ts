const NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL_LOW_COST = process.env.OPENAI_MODEL_LOW_COST;
const INGEST_SHARED_SECRET = process.env.INGEST_SHARED_SECRET;

function requireValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getPublicSupabaseEnv() {
  return {
    url: requireValue("NEXT_PUBLIC_SUPABASE_URL", NEXT_PUBLIC_SUPABASE_URL),
    anonKey: requireValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

export function getServerSupabaseEnv() {
  return {
    serviceRoleKey: requireValue("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY),
  };
}

export function getOpenAIEnv() {
  return {
    apiKey: requireValue("OPENAI_API_KEY", OPENAI_API_KEY),
    model: OPENAI_MODEL_LOW_COST || "gpt-4o-mini",
  };
}

export function getIngestSecret() {
  return requireValue("INGEST_SHARED_SECRET", INGEST_SHARED_SECRET);
}
