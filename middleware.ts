import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/** Keeps the Supabase session cookie fresh on every request (per @supabase/ssr guidance). */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  // When the redirect URL isn't allow-listed, Supabase sends auth results to the Site URL
  // (usually "/") instead of /auth/callback. Route them where they belong.
  const { pathname, searchParams } = request.nextUrl;
  if (!pathname.startsWith("/auth/") && pathname !== "/login") {
    const url = request.nextUrl.clone();
    url.search = "";
    if (searchParams.get("code")) {
      url.pathname = "/auth/callback";
      url.searchParams.set("code", searchParams.get("code")!);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (searchParams.get("error_code") || searchParams.get("error_description")) {
      url.pathname = "/login";
      url.searchParams.set("error", "1");
      for (const k of ["error_code", "error_description"]) {
        const v = searchParams.get(k);
        if (v) url.searchParams.set(k, v);
      }
      return NextResponse.redirect(url);
    }
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });
  // Revalidates the token with Supabase and rotates the cookie if needed.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
