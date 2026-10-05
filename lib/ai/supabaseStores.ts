import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UsageStore } from "./budget";
import { parseCachedReview, type ReviewCache } from "./reviewCache";

/** ai_usage through the SECURITY DEFINER functions in db/migrations/0004_ai_budget.sql. */
export function supabaseUsageStore(admin: SupabaseClient): UsageStore {
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`AI budget ${what} failed: ${error.message}`);
  };
  return {
    async reserve(userId, day, limit) {
      const { data, error } = await admin.rpc("reserve_ai_call", {
        p_user: userId,
        p_day: day,
        p_limit: limit,
      });
      fail("reserve", error);
      return typeof data === "number" ? data : null;
    },
    async release(userId, day) {
      const { error } = await admin.rpc("release_ai_call", { p_user: userId, p_day: day });
      fail("release", error);
    },
    async recordTokens(userId, day, usage) {
      const { error } = await admin.rpc("record_ai_tokens", {
        p_user: userId,
        p_day: day,
        p_input: usage.inputTokens,
        p_output: usage.outputTokens,
      });
      fail("token log", error);
    },
    async used(userId, day) {
      const { data, error } = await admin
        .from("ai_usage")
        .select("calls")
        .eq("user_id", userId)
        .eq("day", day)
        .maybeSingle();
      fail("read", error);
      return (data as { calls: number | null } | null)?.calls ?? 0;
    },
  };
}

/** The `reviews` table, as the signed-in user (RLS: own rows only). */
export function supabaseReviewCache(client: SupabaseClient, userId: string): ReviewCache {
  return {
    async get(designHash, model) {
      const { data } = await client
        .from("reviews")
        .select("review")
        .eq("graph_hash", designHash)
        .eq("model", model)
        .maybeSingle();
      return parseCachedReview((data as { review: unknown } | null)?.review);
    },
    async put(review, model) {
      await client.from("reviews").upsert(
        {
          user_id: userId,
          graph_hash: review.designHash,
          model,
          overall: review.overall,
          level: review.level,
          scores: review.scores,
          issues: review.issues,
          follow_ups: review.followUpQuestions,
          review,
        },
        { onConflict: "user_id,graph_hash,model" },
      );
    },
  };
}
