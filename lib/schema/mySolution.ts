import { z } from "zod";
import { ApiEndpointSchema } from "./api";
import { GraphSchema } from "./graph";
import { EntitySchema } from "./problem";
import { StoredGraphSchema } from "./stored";

/** A submitted design the user saved under a name, to compare later (PHASE-2 §5). */
export const MySolutionSchema = z.object({
  id: z.string(),
  problemId: z.string(),
  title: z.string().min(1),
  graph: GraphSchema,
  apis: z.array(ApiEndpointSchema).default([]),
  entities: z.array(EntitySchema).default([]),
  notes: z.string().optional(),
  /** The attempt it was saved from. */
  attemptId: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  /** Sync bookkeeping: `updatedAt` last pushed; a set `deletedAt` waits to be deleted remotely. */
  pushedAt: z.number().optional(),
  deletedAt: z.number().optional(),
});
export type MySolution = z.infer<typeof MySolutionSchema>;

/** A row of the Supabase `my_solutions` table. */
export const MySolutionRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  problem_id: z.string(),
  title: z.string().nullable(),
  graph: StoredGraphSchema.nullable(),
  apis: z.array(ApiEndpointSchema).nullable(),
  entities: z.array(EntitySchema).nullable(),
  notes: z.string().nullable(),
  created_at: z.string().nullable(),
});
export type MySolutionRow = z.infer<typeof MySolutionRowSchema>;
