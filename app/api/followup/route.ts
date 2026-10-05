import { handleAiRequest } from "@/lib/ai/http";
import { aiConfig } from "@/lib/ai/openrouter";
import { budgetedFollowUp } from "@/lib/ai/service";
import { FollowUpRequestSchema } from "@/lib/schema/ai-requests";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { problemId, attempt, question, answer } → { feedback, scoreDelta, nextQuestion? } */
export function POST(req: Request) {
  return handleAiRequest(req, FollowUpRequestSchema, (body, problem, ctx) =>
    budgetedFollowUp(problem, body.attempt, body.question, body.answer, {
      config: aiConfig()!,
      budget: ctx.budget,
    }),
  );
}
