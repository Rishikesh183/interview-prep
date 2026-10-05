import {
  AiReviewSchema,
  FollowUpResponseSchema,
  type AiReview,
  type Attempt,
  type FollowUpResponse,
} from "@/lib/schema";
import { AiErrorResponseSchema } from "@/lib/schema/ai-requests";
import type { z } from "zod";

/** Browser-side wrappers around the AI route handlers. The API key never leaves the server. */
async function post<S extends z.ZodType>(
  url: string,
  body: unknown,
  schema: S,
): Promise<z.infer<S>> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = AiErrorResponseSchema.safeParse(json);
    throw new Error(err.success ? err.data.error : `Request failed (${res.status}).`);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new Error("The server returned an unexpected response.");
  return parsed.data;
}

export function requestReview(problemId: string, attempt: Attempt): Promise<AiReview> {
  return post("/api/review", { problemId, attempt }, AiReviewSchema);
}

export function requestFollowUp(
  problemId: string,
  attempt: Attempt,
  question: string,
  answer: string,
): Promise<FollowUpResponse> {
  return post("/api/followup", { problemId, attempt, question, answer }, FollowUpResponseSchema);
}

/** Review score adjusted by follow-up answers, clamped to 0–100. */
export function adjustedScore(review: AiReview, followUps: { scoreDelta?: number }[]): number {
  const delta = followUps.reduce((s, f) => s + (f.scoreDelta ?? 0), 0);
  return Math.max(0, Math.min(100, review.overall + delta));
}
