/**
 * Public Supabase settings. Referenced literally so Next inlines them into the browser bundle.
 * When empty, the app runs local-only (IndexedDB) with no sign-in and no sync.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Only same-site paths are allowed as post-login redirects (no open redirects). */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
