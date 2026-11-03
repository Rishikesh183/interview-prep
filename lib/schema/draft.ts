import { z } from "zod";
import { StoredGraphSchema } from "./stored";
import { ApiEndpointSchema } from "./api";
import { EntitySchema } from "./problem";
import { RequirementsSchema, StageSchema } from "./attempt";
import { EstimationInputSchema } from "./estimation";

/** One editable design, not a submitted attempt or an attempt-history record. */
export const DraftContentSchema = z.object({
  v: z.literal(1),
  graph: StoredGraphSchema,
  apis: z.array(ApiEndpointSchema),
  entities: z.array(EntitySchema),
  requirements: RequirementsSchema,
  estimation: EstimationInputSchema.extend({ notes: z.string().default("") }),
  stage: StageSchema,
  hintsRevealed: z.number().int().nonnegative(),
  solutionViewedBeforeSubmit: z.boolean(),
});
export type DraftContent = z.infer<typeof DraftContentSchema>;
export const DraftRowSchema = z.object({
  user_id: z.string().uuid(),
  problem_id: z.string().min(1),
  revision: z.number().int().positive(),
  content: DraftContentSchema,
  updated_at: z.string().datetime({ offset: true }),
});
export type DraftRow = z.infer<typeof DraftRowSchema>;
export const LocalDraftSchema = z.object({
  id: z.string(),
  userId: z.string().uuid(),
  problemId: z.string(),
  content: DraftContentSchema,
  revision: z.number().int().nonnegative(),
  dirty: z.boolean(),
  updatedAt: z.number(),
  linkedAttemptId: z.string().optional(),
  remote: DraftRowSchema.optional(),
});
export type LocalDraft = z.infer<typeof LocalDraftSchema>;
export const DraftWriteResultSchema = z.object({
  outcome: z.enum(["saved", "conflict"]),
  row: DraftRowSchema,
});
export type DraftWriteResult = z.infer<typeof DraftWriteResultSchema>;
