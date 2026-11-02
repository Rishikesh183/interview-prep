import { assertSolutionUser } from "@/lib/auth/solutions";
import { SolutionContentSchema, type Problem } from "@/lib/schema";

export async function fetchSolutionContent(
  problemId: string,
  expectedUserId: string,
  signal?: AbortSignal,
): Promise<Problem> {
  assertSolutionUser(expectedUserId);
  const response = await fetch(`/api/problems/${encodeURIComponent(problemId)}/solutions`, {
    cache: "no-store",
    signal,
  });
  const body = await response.json();
  assertSolutionUser(expectedUserId);
  if (!response.ok) throw new Error(body.error || "Couldn't load solutions.");
  const content = SolutionContentSchema.parse(body);
  if (content.viewerId !== expectedUserId || content.problem.id !== problemId)
    throw new Error("Your session changed. Reload solutions and try again.");
  return content.problem;
}
