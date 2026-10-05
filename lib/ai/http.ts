import "server-only";
import type { z } from "zod";
import { getProblem } from "@/lib/problems/load";
import type { Problem } from "@/lib/schema";
import type { AiUsage } from "@/lib/schema/ai-requests";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { supabaseServer } from "@/lib/supabase/server";
import { budgetDay, dailyLimit, MAX_FOLLOW_UPS, type Budget } from "./budget";
import { aiConfig, AiError, deepAiConfig } from "./openrouter";
import { layeredCache, memoryReviewCache, scopedCache, type ReviewCache } from "./reviewCache";
import { supabaseReviewCache, supabaseUsageStore } from "./supabaseStores";

const json = (body: unknown, status = 200) => Response.json(body, { status });

/** Survives between requests in one server process (the only cache in local-only mode). */
const processCache = memoryReviewCache();

/** Who is asking, plus the cache and budget that apply to them. */
export type AiRequestContext = { userId: string | null; cache: ReviewCache; budget: Budget | null };

/**
 * With Supabase configured, AI needs a signed-in user and the daily budget is enforced.
 * Without it (local-only), there's no account and no budget.
 */
async function requestContext(): Promise<AiRequestContext | Response> {
  if (!isSupabaseConfigured) {
    return { userId: null, cache: scopedCache(processCache, "local"), budget: null };
  }
  const client = await supabaseServer();
  const user = client ? (await client.auth.getUser()).data.user : null;
  if (!client || !user) return json({ error: "Sign in to use AI review." }, 401);

  const admin = supabaseAdmin();
  if (!admin) {
    return json(
      { error: "AI budget isn't configured: set SUPABASE_SERVICE_ROLE_KEY on the server." },
      503,
    );
  }
  return {
    userId: user.id,
    cache: layeredCache(scopedCache(processCache, user.id), supabaseReviewCache(client, user.id)),
    budget: { store: supabaseUsageStore(admin), userId: user.id, limit: dailyLimit() },
  };
}

/** Shared plumbing for AI route handlers: config, auth, budget, body validation, errors. */
export async function handleAiRequest<S extends z.ZodType<{ problemId: string }>>(
  req: Request,
  schema: S,
  run: (body: z.infer<S>, problem: Problem, ctx: AiRequestContext) => Promise<unknown>,
): Promise<Response> {
  if (!aiConfig()) {
    return json(
      { error: "AI review isn't configured: set OPENROUTER_API_KEY in .env.local and restart." },
      503,
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request body." }, 400);

  const problem = getProblem(parsed.data.problemId);
  if (!problem) return json({ error: "Unknown problem." }, 404);

  try {
    const ctx = await requestContext();
    if (ctx instanceof Response) return ctx;
    return json(await run(parsed.data, problem, ctx));
  } catch (err) {
    if (err instanceof AiError) return json({ error: err.message }, err.status);
    console.error("AI request failed", err);
    return json({ error: "Unexpected error while contacting the model." }, 500);
  }
}

/** GET /api/usage: model names and today's budget for the signed-in user (no secrets). */
export async function usageSummary(): Promise<AiUsage> {
  const config = aiConfig();
  const limit = dailyLimit();
  const summary: AiUsage = {
    configured: config !== null,
    signInRequired: isSupabaseConfigured,
    signedIn: false,
    enforced: isSupabaseConfigured,
    limit,
    used: 0,
    remaining: limit,
    models: {
      review: config?.models[0] ?? null,
      fallbacks: config?.models.slice(1) ?? [],
      deep: deepAiConfig()?.models[0] ?? null,
    },
    reasoningEffort: config?.reasoningEffort ?? "low",
    maxFollowUps: MAX_FOLLOW_UPS,
  };
  if (!isSupabaseConfigured) return summary;

  const client = await supabaseServer();
  const user = client ? (await client.auth.getUser()).data.user : null;
  if (!user) return summary;
  const admin = supabaseAdmin();
  const used = admin
    ? await supabaseUsageStore(admin)
        .used(user.id, budgetDay())
        .catch(() => 0)
    : 0;
  return { ...summary, signedIn: true, used, remaining: Math.max(0, limit - used) };
}
