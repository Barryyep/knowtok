import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!url || !anonKey) {
  console.warn("Supabase env vars missing — set EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY in .env");
}

/**
 * Same Supabase project as the knowtok web app — accounts are shared.
 * RLS lets authenticated users read `papers` and manage their own
 * `user_personas`, so the app talks to the database directly.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
