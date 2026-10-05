import { z } from "zod";

/** Best result per problem (PHASE-2 §3). Only the best attempt counts; it never goes down. */
export const ProgressSchema = z.object({
  problemId: z.string(),
  bestPoints: z.number().int().min(0).default(0),
  /** Weighted tests passed ÷ total weight of the best attempt, 0–1. */
  bestRatio: z.number().min(0).max(1).default(0),
  /** First time every core test passed on a submitted attempt (ms). */
  solvedAt: z.number().optional(),
  updatedAt: z.number(),
  /** `updatedAt` last pushed to the server (sync bookkeeping). */
  pushedAt: z.number().optional(),
});
export type Progress = z.infer<typeof ProgressSchema>;

/** A row of the Supabase `progress` table. */
export const ProgressRowSchema = z.object({
  user_id: z.string().uuid(),
  problem_id: z.string(),
  best_points: z.number().int().nullable(),
  best_ratio: z.number().nullable(),
  solved_at: z.string().nullable(),
});
export type ProgressRow = z.infer<typeof ProgressRowSchema>;
