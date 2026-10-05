import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";

/** OAuth (GitHub) and magic-link landing: trade the one-time code for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const supabase = await supabaseServer();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=1&next=${encodeURIComponent(next)}`);
}
