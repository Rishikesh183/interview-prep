import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, SUPABASE_URL } from "./config";

let client: SupabaseClient | null | undefined;

/**
 * Service-role client: bypasses RLS, so it is used only for the AI budget RPCs.
 * SUPABASE_SERVICE_ROLE_KEY is read on the server and never sent to the browser.
 */
export function supabaseAdmin(): SupabaseClient | null {
  if (client !== undefined) return client;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  client =
    isSupabaseConfigured && key
      ? createClient(SUPABASE_URL, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  return client;
}
