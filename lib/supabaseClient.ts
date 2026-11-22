/**
 * The browser's connection to Supabase.
 *
 * Uses the project URL and the public "anon" key from environment variables. That key is
 * designed to be public: on its own it can't read anything, because every table is
 * protected by row-level security (see supabase/migrations). Never put the secret
 * "service_role" key in the app.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** False until the two environment variables are set (in .env.local and on Vercel). */
export const supabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseConfigured) throw new Error("Supabase isn't configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  client ??= createClient(url!, anonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Sign-in links come back as ?code=…, which doesn't clash with the vaults' #/ routes.
      flowType: "pkce",
      storageKey: "dream-vault:auth",
    },
  });
  return client;
}
