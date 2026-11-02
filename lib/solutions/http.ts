import "server-only";
import { getProblem } from "@/lib/problems/load";
import { supabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });

/** Reference content is delivered only after Supabase verifies the requesting session. */
export async function solutionContentResponse(problemId: string): Promise<Response> {
  if (!isSupabaseConfigured)
    return json({ error: "Sign-in must be configured to view solutions." }, 503);
  try {
    const client = await supabaseServer();
    const identity = client ? await client.auth.getUser() : null;
    if (!identity || identity.error || !identity.data.user)
      return json({ error: "Sign in to view solutions." }, 401);
    const problem = getProblem(problemId);
    if (!problem) return json({ error: "Unknown problem." }, 404);
    return json({ viewerId: identity.data.user.id, problem });
  } catch {
    return json({ error: "Couldn't load solutions. Check your connection and try again." }, 503);
  }
}
