import type { AiReview, Attempt, FollowUpResponse, Problem } from "@/lib/schema";
import { MAX_FOLLOW_UPS, withBudget, type Budget } from "./budget";
import { AiError, type AiConfig, type ReviewTier } from "./openrouter";
import { answerFollowUp, reviewAttempt } from "./review";
import type { ReviewCache } from "./reviewCache";
import { designHash } from "./serialize";

export type AiDeps = {
  config: AiConfig;
  cache: ReviewCache;
  /** null = no budget (Supabase not configured). */
  budget: Budget | null;
  fetchImpl?: typeof fetch;
};

/**
 * Cache first: an unchanged design (same hash, same model) returns the stored review with no
 * model call and no budget used. Otherwise one budgeted call, then cache the result.
 */
export async function cachedReview(
  problem: Problem,
  attempt: Attempt,
  tier: ReviewTier,
  deps: AiDeps,
): Promise<AiReview> {
  const model = deps.config.models[0];
  const hit = await deps.cache.get(designHash(attempt), model);
  if (hit) return { ...hit, cached: true };

  const review = await withBudget(deps.budget, (onUsage) =>
    reviewAttempt(problem, attempt, {
      config: deps.config,
      fetchImpl: deps.fetchImpl,
      onUsage,
      tier,
    }),
  );
  await deps.cache.put(review, model);
  return review;
}

export async function budgetedFollowUp(
  problem: Problem,
  attempt: Attempt,
  question: string,
  answer: string,
  deps: Omit<AiDeps, "cache">,
): Promise<FollowUpResponse> {
  if (attempt.followUps.length >= MAX_FOLLOW_UPS) {
    throw new AiError(
      `That's the limit of ${MAX_FOLLOW_UPS} follow-up questions per attempt.`,
      400,
    );
  }
  return withBudget(deps.budget, (onUsage) =>
    answerFollowUp(problem, attempt, question, answer, {
      config: deps.config,
      fetchImpl: deps.fetchImpl,
      onUsage,
    }),
  );
}
