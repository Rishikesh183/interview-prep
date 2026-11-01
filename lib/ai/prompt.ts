import type { AiReview, Attempt, LintIssue, Problem, TestResult } from "@/lib/schema";
import { rubricFor } from "./rubric";
import { serializeAttempt, serializeGraph } from "./serialize";

/**
 * `system` + `context` (rubric + problem content) are the same for every review of a problem, so
 * they form the cached prefix; the user's design comes after, in `user` (PHASE-2 §2, layer 4).
 */
export type ChatPrompt = { system: string; context?: string; user: string };

const reviewSystem = (
  track: Problem["track"],
) => `You are a senior staff engineer running a ${track} system design interview. You grade a candidate's written design like a fair, demanding interviewer.

RUBRIC (score each dimension 0-10, integers):
${rubricFor(track)
  .map((r) => `- ${r.dimension} (weight ${r.weight}): ${r.label}: ${r.looksFor}`)
  .join("\n")}

RULES
- Judge reasoning, trade-offs and fit to the requirements. Structural checks (linter, tests) were already run; use their results as evidence, don't just repeat them.
- Alternative valid designs score fully. Never reward or penalise a design for matching or differing from the reference requirements' wording or any "standard" answer.
- Every issue MUST list node ids (e.g. "n3") in nodeIds, using only ids that appear under NODES. For something MISSING (e.g. no cache), cite existing components on the affected path. Use [] only for issues that truly concern no component (e.g. requirements).
- severity "high" = would fail the interview or break at the stated scale (${track === "frontend" ? "e.g. stale responses overwrite current results or the core interaction cannot be used by keyboard" : "e.g. a single unreplicated DB under a high-availability requirement, no cache on a 100:1 read path"}). "medium" = clear gap. "low" = polish.
- "missing" lists important topics the candidate didn't address at all.
- Ask 3-5 follow-up questions an interviewer would probe next, specific to THIS design.
- Be concise: one or two sentences per comment, issue and fix.

Reply with ONLY a JSON object, no prose, matching:
{"scores":[{"dimension":"requirements","score":7,"comment":"..."}, ...one per dimension...],
 "strengths":["..."],
 "issues":[{"severity":"high","nodeIds":["n3"],"text":"...","fix":"..."}],
 "missing":["..."],
 "followUpQuestions":["..."]}`;

export function buildReviewPrompt(
  problem: Problem,
  attempt: Attempt,
  lint: LintIssue[],
  tests: TestResult[],
): ChatPrompt {
  const testById = new Map(problem.tests.map((t) => [t.id, t.title]));
  const passed = tests.filter((t) => t.passed).length;

  const context = `PROBLEM: ${problem.title} (${problem.difficulty})
${problem.prompt}
Scale: ${Object.entries(problem.scale)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ")}

REFERENCE REQUIREMENTS (hidden from the candidate; use to judge scoping, not wording):
Functional: ${problem.functionalReqs.join("; ")}
Non-functional: ${problem.nonFunctionalReqs.join("; ")}
Out of scope: ${problem.outOfScope.join("; ") || "-"}

PROBLEM-SPECIFIC SCORING POINTS: ${problem.rubricFocus.join("; ")}
DEEP DIVES AN INTERVIEWER WOULD PROBE: ${problem.deepDives.join("; ")}`;

  const user = `=== CANDIDATE SUBMISSION ===
${serializeAttempt(attempt, problem.track)}

=== AUTOMATED CHECKS ===
LINT (${lint.length}):
${lint.length ? lint.map((i) => `  [${i.severity}] ${i.message}${i.nodeIds.length ? ` (${i.nodeIds.join(", ")})` : ""}`).join("\n") : "  (clean)"}
TESTS: ${passed}/${tests.length} passed
${tests.map((t) => `  ${t.passed ? "PASS" : "FAIL"} ${testById.get(t.id) ?? t.id}`).join("\n")}`;

  const system =
    reviewSystem(problem.track) +
    (problem.track === "frontend"
      ? "\nFRONTEND TRACK: Grade browser architecture. Do not demand databases, sharding, load balancers or server queues for a frontend-only exercise. Treat the backend as a dependency. A written budget is not proof of measured speed or accessibility. Prioritize state ownership, races, rendering, keyboard/focus and recovery."
      : "");
  return { system, context: `TRACK: ${problem.track}\n${context}`, user };
}

const FOLLOWUP_SYSTEM = `You are a senior system design interviewer. The candidate is answering one of your follow-up questions about their design. Evaluate the answer: is it correct, specific to their design, and does it show understanding of trade-offs?

scoreDelta adjusts their overall score (0-100 scale): -5 (wrong or hand-wavy, reveals a real gap) to +5 (excellent, fixes a weakness you flagged). 0 for adequate.
Optionally ask ONE sharper next question if the answer opens an important thread; otherwise null.

Reply with ONLY a JSON object: {"feedback":"2-4 sentences","scoreDelta":0,"nextQuestion":null}`;

export function buildFollowUpPrompt(
  problem: Problem,
  attempt: Attempt,
  review: AiReview | undefined,
  question: string,
  answer: string,
): ChatPrompt {
  const issues = review?.issues.map((i) => `  [${i.severity}] ${i.text}`).join("\n") ?? "  (none)";
  const context = `TRACK: ${problem.track}. For frontend, evaluate browser state, rendering, accessibility and recovery; backend implementation is out of scope.
PROBLEM: ${problem.title}
${problem.prompt}`;
  const user = `CANDIDATE DESIGN:
${serializeGraph(attempt)}

ISSUES YOU RAISED IN THE REVIEW:
${issues}

QUESTION: ${question}
CANDIDATE ANSWER: ${answer}`;
  return { system: FOLLOWUP_SYSTEM, context, user };
}
