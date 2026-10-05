import { z } from "zod";
import { AttemptSchema } from "./attempt";

export const ReviewRequestSchema = z.object({
  problemId: z.string().min(1),
  attempt: AttemptSchema,
});

export const FollowUpRequestSchema = z.object({
  problemId: z.string().min(1),
  attempt: AttemptSchema,
  question: z.string().min(1).max(1000),
  answer: z.string().min(1).max(4000),
});

export const AiErrorResponseSchema = z.object({ error: z.string() });
