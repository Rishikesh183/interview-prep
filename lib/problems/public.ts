import "server-only";
import { PublicProblemSchema, type Problem, type PublicProblem } from "@/lib/schema";

/** Explicit allowlist: no reference answers, diagrams or hidden requirement lists in public props. */
export function publicProblem(problem: Problem): PublicProblem {
  return PublicProblemSchema.parse({
    id: problem.id,
    number: problem.number,
    title: problem.title,
    difficulty: problem.difficulty,
    priority: problem.priority,
    track: problem.track,
    tags: problem.tags,
    prompt: problem.prompt,
    scale: problem.scale,
    hints: problem.hints,
    tests: problem.tests,
    keyComponents: problem.keyComponents,
    prerequisites: problem.prerequisites,
    functionalReqs: [],
    nonFunctionalReqs: [],
    outOfScope: [],
    deepDives: [],
    rubricFocus: [],
    references: [],
  });
}
