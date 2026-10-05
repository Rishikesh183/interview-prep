import "server-only";
import { runLint } from "@/lib/lint";
import { lintContext } from "@/lib/lint/context";
import {
  ModelFollowUpSchema,
  ModelReviewSchema,
  type AiReview,
  type Attempt,
  type FollowUpResponse,
  type Problem,
} from "@/lib/schema";
import { runAttemptTests } from "@/lib/tests/context";
import { chatJson, type AiConfig } from "./openrouter";
import { buildFollowUpPrompt, buildReviewPrompt } from "./prompt";
import { levelFor, overallScore, RUBRIC } from "./rubric";
import { designHash } from "./serialize";

/** Every rubric dimension must be scored; a gap triggers the one retry. */
const CompleteReviewSchema = ModelReviewSchema.refine(
  (r) => RUBRIC.every((d) => r.scores.some((s) => s.dimension === d.dimension)),
  { message: `scores must include every dimension: ${RUBRIC.map((d) => d.dimension).join(", ")}` },
);

type Deps = { config: AiConfig; fetchImpl?: typeof fetch };

export async function reviewAttempt(
  problem: Problem,
  attempt: Attempt,
  deps: Deps,
): Promise<AiReview> {
  // Recompute checks server-side rather than trusting what the client sent.
  const lint = runLint(
    lintContext({
      graph: attempt.graph,
      apis: attempt.apis,
      estimation: attempt.estimation,
      requirements: attempt.requirements,
      problem,
    }),
  );
  const tests = runAttemptTests(problem, attempt).results;
  const { data, model } = await chatJson({
    prompt: buildReviewPrompt(problem, attempt, lint, tests),
    schema: CompleteReviewSchema,
    ...deps,
  });

  const nodeIds = new Set(attempt.graph.nodes.map((n) => n.id));
  const scores = RUBRIC.map((d) => data.scores.find((s) => s.dimension === d.dimension)!);
  const overall = overallScore(scores);
  return {
    overall,
    level: levelFor(overall),
    scores,
    strengths: data.strengths,
    // Drop hallucinated ids so highlighting never points at nothing.
    issues: data.issues.map((i) => ({ ...i, nodeIds: i.nodeIds.filter((id) => nodeIds.has(id)) })),
    missing: data.missing,
    followUpQuestions: data.followUpQuestions.slice(0, 5),
    model,
    createdAt: Date.now(),
    designHash: designHash(attempt),
  };
}

export async function answerFollowUp(
  problem: Problem,
  attempt: Attempt,
  question: string,
  answer: string,
  deps: Deps,
): Promise<FollowUpResponse> {
  const { data } = await chatJson({
    prompt: buildFollowUpPrompt(problem, attempt, attempt.review, question, answer),
    schema: ModelFollowUpSchema,
    maxTokens: 1200,
    ...deps,
  });
  return {
    feedback: data.feedback,
    scoreDelta: Math.round(data.scoreDelta),
    ...(data.nextQuestion ? { nextQuestion: data.nextQuestion } : {}),
  };
}
