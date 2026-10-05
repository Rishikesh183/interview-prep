import { handleAiRequest } from "@/lib/ai/http";
import { answerFollowUp } from "@/lib/ai/review";
import { FollowUpRequestSchema } from "@/lib/schema/ai-requests";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { problemId, attempt, question, answer } → { feedback, scoreDelta, nextQuestion? } */
export function POST(req: Request) {
  return handleAiRequest(req, FollowUpRequestSchema, (body, problem, config) =>
    answerFollowUp(problem, body.attempt, body.question, body.answer, { config }),
  );
}
