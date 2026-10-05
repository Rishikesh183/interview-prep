import { z } from "zod";
import { ApiEndpointSchema } from "./api";
import { EstimationSchema } from "./estimation";
import { GraphSchema } from "./graph";
import { LintIssueSchema } from "./lint";
import { EntitySchema } from "./problem";
import { AiReviewSchema, FollowUpSchema } from "./review";

export const StageSchema = z.enum([
  "requirements",
  "estimation",
  "data_model",
  "apis",
  "design",
  "review",
]);
export type Stage = z.infer<typeof StageSchema>;

export const AttemptStatusSchema = z.enum(["in_progress", "submitted", "reviewed"]);
export type AttemptStatus = z.infer<typeof AttemptStatusSchema>;

const lines = z.array(z.string()).default([]);

export const RequirementsSchema = z.object({
  functional: lines,
  nonFunctional: lines,
  outOfScope: lines,
  questions: lines,
});
export type Requirements = z.infer<typeof RequirementsSchema>;

export const TestResultSchema = z.object({ id: z.string(), passed: z.boolean() });
export type TestResult = z.infer<typeof TestResultSchema>;

export const TestRunSchema = z.object({
  ranAt: z.number(),
  results: z.array(TestResultSchema),
});
export type TestRun = z.infer<typeof TestRunSchema>;

export const AttemptSchema = z.object({
  id: z.string().min(1),
  problemId: z.string().min(1),
  startedAt: z.number(),
  updatedAt: z.number(),
  submittedAt: z.number().optional(),
  durationSec: z.number().optional(),
  status: AttemptStatusSchema.default("in_progress"),
  stage: StageSchema.default("requirements"),
  /** Active time spent on the attempt (only ticks while the tab is visible). */
  elapsedMs: z.number().default(0),
  /** Interview time limit in minutes; null means no countdown. */
  timerLimitMin: z.number().positive().nullable().default(45),
  /** User paused the clock (e.g. a break). Persisted so a reload stays paused. */
  timerPaused: z.boolean().default(false),
  hintsRevealed: z.number().int().min(0).default(0),
  requirements: RequirementsSchema.default({
    functional: [],
    nonFunctional: [],
    outOfScope: [],
    questions: [],
  }),
  estimation: EstimationSchema.default(EstimationSchema.parse({})),
  entities: z.array(EntitySchema).default([]),
  apis: z.array(ApiEndpointSchema).default([]),
  graph: GraphSchema.default({ nodes: [], edges: [] }),
  /** Linter results at the last save (recomputed live in the UI). */
  lint: z.array(LintIssueSchema).default([]),
  testRun: TestRunSchema.optional(),
  review: AiReviewSchema.optional(),
  followUps: z.array(FollowUpSchema).default([]),
});
export type Attempt = z.infer<typeof AttemptSchema>;
