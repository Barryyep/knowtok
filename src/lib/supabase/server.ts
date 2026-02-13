import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { getPublicSupabaseEnv, getServerSupabaseEnv } from "@/lib/env";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

function parseBearerToken(request: Request): string {
  const authHeader = request.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new UnauthorizedError("Missing bearer token");
  }
  return token;
}

export function createAnonClient(accessToken?: string): SupabaseClient {
  const { url, anonKey } = getPublicSupabaseEnv();
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

export function createServiceRoleClient(): SupabaseClient {
  const { url } = getPublicSupabaseEnv();
  const { serviceRoleKey } = getServerSupabaseEnv();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function getAuthedClient(request: Request): Promise<{
  client: SupabaseClient;
  user: User;
}> {
  const accessToken = parseBearerToken(request);
  const client = createAnonClient(accessToken);
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new UnauthorizedError(error?.message || "Invalid token");
  }

  return {
    client,
    user: data.user,
  };
}
