import { z } from "zod";
import { ApiEndpointSchema } from "./api";
import { AttemptSchema, RequirementsSchema, StageSchema, TestRunSchema } from "./attempt";
import { EstimationSchema } from "./estimation";
import { LintIssueSchema } from "./lint";
import { EntitySchema } from "./problem";
import { AiReviewSchema, FollowUpSchema } from "./review";
import { StoredGraphSchema } from "./stored";

/** Workspace state that follows the user across devices, stored in attempts.client_state. */
export const ClientStateSchema = z.object({
  stage: StageSchema.optional(),
  elapsedMs: z.number().optional(),
  timerLimitMin: z.number().nullable().optional(),
  timerPaused: z.boolean().optional(),
  testRun: TestRunSchema.optional(),
  lint: z.array(LintIssueSchema).optional(),
  review: AiReviewSchema.optional(),
  followUps: z.array(FollowUpSchema).optional(),
  /** Local status kept precisely ("reviewed" is stored as "submitted" in the status column). */
  status: AttemptSchema.shape.status.optional(),
});
export type ClientState = z.infer<typeof ClientStateSchema>;

/** A row of the Supabase `attempts` table, as returned by PostgREST. */
export const AttemptRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  problem_id: z.string(),
  status: z.enum(["in_progress", "submitted"]),
  started_at: z.string(),
  submitted_at: z.string().nullable(),
  duration_sec: z.number().int().nullable(),
  requirements: RequirementsSchema.nullable(),
  estimation: EstimationSchema.nullable(),
  entities: z.array(EntitySchema).nullable(),
  apis: z.array(ApiEndpointSchema).nullable(),
  graph: StoredGraphSchema.nullable(),
  graph_hash: z.string().nullable(),
  tests_passed: z.number().int().nullable(),
  tests_total: z.number().int().nullable(),
  hints_used: z.number().int().nullable(),
  solution_viewed_before_submit: z.boolean().nullable(),
  points: z.number().int().nullable(),
  client_state: ClientStateSchema.nullable(),
  updated_at: z.string(),
});
export type AttemptRow = z.infer<typeof AttemptRowSchema>;

/** Just enough to decide who is newer. */
export const AttemptStampSchema = z.object({ id: z.string(), updated_at: z.string() });
export type AttemptStamp = z.infer<typeof AttemptStampSchema>;
