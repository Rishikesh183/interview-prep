import { z } from "zod";

export const LeaderboardEntrySchema = z.object({
  user_id: z.string().uuid(),
  display_name: z.string().min(1).max(60),
  total_points: z.number().int().nonnegative(),
  solved_count: z.number().int().nonnegative(),
  attempted_count: z.number().int().nonnegative(),
  rank: z.number().int().positive(),
});
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

/** Only aggregate totals are returned; attempts, email addresses and per-question rows stay private. */
export const LeaderboardTotalsSchema = z.object({
  entries: z.array(LeaderboardEntrySchema).max(100),
  current_user: LeaderboardEntrySchema.nullable(),
  total_participants: z.number().int().nonnegative(),
});

export const LeaderboardSchema = LeaderboardTotalsSchema.extend({
  viewer_id: z.string().uuid(),
  maximum_points: z.number().int().nonnegative(),
  problem_count: z.number().int().positive(),
  updated_at: z.string().datetime(),
});
export type Leaderboard = z.infer<typeof LeaderboardSchema>;
