function requireValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getPublicSupabaseEnv() {
  const nextPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const nextPublicAnon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  return {
    url: requireValue("NEXT_PUBLIC_SUPABASE_URL", nextPublicUrl),
    anonKey: requireValue("NEXT_PUBLIC_SUPABASE_ANON_KEY", nextPublicAnon),
  };
}

export function getServerSupabaseEnv() {
  return {
    serviceRoleKey: requireValue("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

export function getOptionalServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

export function getOpenAIEnv() {
  const model = process.env.OPENAI_MODEL_LOW_COST;
  return {
    apiKey: requireValue("OPENAI_API_KEY", process.env.OPENAI_API_KEY),
    model: model || "gpt-4o-mini",
  };
}

export function getIngestSecret() {
  return requireValue("INGEST_SHARED_SECRET", process.env.INGEST_SHARED_SECRET);
}
