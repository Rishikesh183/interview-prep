import { z } from "zod";
import { AttemptSchema } from "./attempt";

export const ReviewRequestSchema = z.object({
  problemId: z.string().min(1),
  attempt: AttemptSchema,
  tier: z.enum(["standard", "deep"]).default("standard"),
});

export const FollowUpRequestSchema = z.object({
  problemId: z.string().min(1),
  attempt: AttemptSchema,
  question: z.string().min(1).max(1000),
  answer: z.string().min(1).max(4000),
});

export const AiErrorResponseSchema = z.object({ error: z.string() });

/** GET /api/usage: what the settings page and review panel show. */
export const AiUsageSchema = z.object({
  /** OPENROUTER_API_KEY is set. */
  configured: z.boolean(),
  /** Supabase is set up, so AI needs a signed-in user. */
  signInRequired: z.boolean(),
  signedIn: z.boolean(),
  /** Budget enforced (Supabase configured); otherwise calls are unlimited. */
  enforced: z.boolean(),
  limit: z.number().int(),
  used: z.number().int(),
  remaining: z.number().int(),
  models: z.object({
    review: z.string().nullable(),
    fallbacks: z.array(z.string()),
    deep: z.string().nullable(),
  }),
  reasoningEffort: z.string(),
  maxFollowUps: z.number().int(),
});
export type AiUsage = z.infer<typeof AiUsageSchema>;
