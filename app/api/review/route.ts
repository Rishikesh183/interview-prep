import { handleAiRequest } from "@/lib/ai/http";
import { configForTier } from "@/lib/ai/openrouter";
import { cachedReview } from "@/lib/ai/service";
import { ReviewRequestSchema } from "@/lib/schema/ai-requests";

export const runtime = "nodejs";
// Free models can be slow; give them time when deployed.
export const maxDuration = 120;

/** POST { problemId, attempt, tier? } → AiReview (cached by design hash + model). */
export function POST(req: Request) {
  return handleAiRequest(req, ReviewRequestSchema, async (body, problem, ctx) => {
    const config = configForTier(body.tier);
    if (!config) {
      return Response.json(
        { error: "Deep review isn't configured: set DEEP_REVIEW_MODEL on the server." },
        { status: 400 },
      );
    }
    return cachedReview(problem, body.attempt, body.tier, { config, ...ctx });
  });
}
