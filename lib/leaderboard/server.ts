import "server-only";
import { BASE_POINTS } from "@/lib/points";
import { problemSummaries } from "@/lib/problems/load";
import { LeaderboardSchema, LeaderboardTotalsSchema } from "@/lib/schema";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", Vary: "Cookie" },
  });

/** Authenticate before using the privileged aggregate RPC; never fetch raw cross-user progress. */
export async function leaderboardResponse(): Promise<Response> {
  if (!isSupabaseConfigured)
    return json({ error: "The shared leaderboard isn't available in local-only mode." }, 503);
  try {
    const client = await supabaseServer();
    const identity = client ? await client.auth.getUser() : null;
    if (!identity || identity.error || !identity.data.user)
      return json({ error: "Sign in to view the leaderboard." }, 401);
    const admin = supabaseAdmin();
    if (!admin)
      return json(
        { error: "The leaderboard is temporarily unavailable. Please try again later." },
        503,
      );

    const catalog = problemSummaries().map((p) => ({
      problem_id: p.id,
      max_points: BASE_POINTS[p.difficulty],
    }));
    const { data, error } = await admin.rpc("all_time_leaderboard", {
      p_catalog: catalog,
      p_viewer: identity.data.user.id,
    });
    if (error) {
      console.error("Leaderboard aggregate failed", { code: error.code });
      return json(
        { error: "The leaderboard is temporarily unavailable. Please try again later." },
        503,
      );
    }
    const totals = LeaderboardTotalsSchema.parse(data);
    const result = LeaderboardSchema.parse({
      ...totals,
      viewer_id: identity.data.user.id,
      maximum_points: catalog.reduce((sum, p) => sum + p.max_points, 0),
      problem_count: catalog.length,
      updated_at: new Date().toISOString(),
    });
    return json(result);
  } catch {
    return json({ error: "Couldn't load the leaderboard. Please try again." }, 503);
  }
}
