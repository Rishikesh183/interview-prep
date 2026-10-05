import { z } from "zod";

export const RubricDimensionSchema = z.enum([
  "requirements",
  "estimation",
  "data_model",
  "api_design",
  "architecture",
  "scalability",
  "reliability",
  "tradeoffs",
]);
export type RubricDimension = z.infer<typeof RubricDimensionSchema>;

export const ReviewLevelSchema = z.enum(["below_bar", "junior", "mid", "senior"]);
export type ReviewLevel = z.infer<typeof ReviewLevelSchema>;

export const IssueSeveritySchema = z.enum(["high", "medium", "low"]);

const clamp = (min: number, max: number) =>
  z.coerce.number().transform((n) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min)));

// ---- What the model must return (lenient: free models vary in output discipline) ----

export const ModelReviewSchema = z.object({
  scores: z
    .array(
      z.object({
        dimension: RubricDimensionSchema,
        score: clamp(0, 10),
        comment: z.string(),
      }),
    )
    .min(1),
  strengths: z.array(z.string()).default([]),
  issues: z
    .array(
      z.object({
        severity: IssueSeveritySchema,
        nodeIds: z
          .array(z.string())
          .nullish()
          .transform((v) => v ?? []),
        text: z.string(),
        fix: z.string(),
      }),
    )
    .default([]),
  missing: z.array(z.string()).default([]),
  followUpQuestions: z.array(z.string()).min(1),
});
export type ModelReview = z.infer<typeof ModelReviewSchema>;

export const ModelFollowUpSchema = z.object({
  feedback: z.string(),
  scoreDelta: clamp(-5, 5),
  nextQuestion: z.string().nullish(),
});
export type ModelFollowUp = z.infer<typeof ModelFollowUpSchema>;

// ---- What we store and show (spec §5 AiReview + provenance) ----

export const AiReviewSchema = z.object({
  overall: z.number().min(0).max(100),
  level: ReviewLevelSchema,
  scores: ModelReviewSchema.shape.scores,
  strengths: z.array(z.string()),
  issues: ModelReviewSchema.shape.issues,
  missing: z.array(z.string()),
  followUpQuestions: z.array(z.string()),
  model: z.string(),
  createdAt: z.number(),
  /** Hash of the serialized design; an unchanged design reuses the saved review. */
  designHash: z.string(),
});
export type AiReview = z.infer<typeof AiReviewSchema>;

export const FollowUpSchema = z.object({
  question: z.string(),
  answer: z.string(),
  feedback: z.string().optional(),
  scoreDelta: z.number().optional(),
  /** A sharper question the interviewer asked in reply. */
  nextQuestion: z.string().optional(),
});
export type FollowUp = z.infer<typeof FollowUpSchema>;

export const FollowUpResponseSchema = z.object({
  feedback: z.string(),
  scoreDelta: z.number(),
  nextQuestion: z.string().optional(),
});
export type FollowUpResponse = z.infer<typeof FollowUpResponseSchema>;
