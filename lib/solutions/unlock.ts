import { assertSolutionUser, verifySolutionUser } from "@/lib/auth/solutions";
import { markSolutionsPeeked } from "@/lib/db/mySolutions";
import { useAttemptStore } from "@/store/attempt";

export async function unlockAttemptSolutions(
  problemId: string,
  attemptId: string,
): Promise<boolean> {
  const userId = await verifySolutionUser();
  assertSolutionUser(userId);
  const { meta } = useAttemptStore.getState();
  if (meta?.id !== attemptId || meta.problemId !== problemId || meta.status !== "in_progress")
    return false;
  useAttemptStore.getState().unlockSolutions();
  return true;
}

export async function unlockProblemSolutions(problemId: string): Promise<void> {
  const userId = await verifySolutionUser();
  await markSolutionsPeeked(problemId, Date.now(), () => {
    assertSolutionUser(userId);
  });
}
