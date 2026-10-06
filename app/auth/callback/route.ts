import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

/** OAuth (Google, GitHub) and magic-link landing: trade the one-time code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const supabase = await supabaseServer();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  // Supabase sends provider errors (e.g. "provider is not enabled") back as query params.
  const out = new URL("/login", origin);
  out.searchParams.set("error", "1");
  out.searchParams.set("next", next);
  for (const k of ["error_code", "error_description"]) {
    const v = searchParams.get(k);
    if (v) out.searchParams.set(k, v);
  }
  // No code and no reason: most likely the link was opened in a different browser.
  if (!out.searchParams.has("error_description") && code)
    out.searchParams.set("error_code", "exchange_failed");
  return NextResponse.redirect(out);
}
