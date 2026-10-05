import { handleAiRequest } from "@/lib/ai/http";
import { reviewAttempt } from "@/lib/ai/review";
import { ReviewRequestSchema } from "@/lib/schema/ai-requests";

export const runtime = "nodejs";
// Free models can be slow; give them time when deployed.
export const maxDuration = 120;

/** POST { problemId, attempt } → AiReview */
export function POST(req: Request) {
  return handleAiRequest(req, ReviewRequestSchema, (body, problem, config) =>
    reviewAttempt(problem, body.attempt, { config }),
  );
}
