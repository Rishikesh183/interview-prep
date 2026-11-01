"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { hasSubmittedProblem, listAttempts } from "@/lib/db/attempts";
import type { Attempt } from "@/lib/schema";

/** Live list of all attempts (newest first); `undefined` while loading. */
export function useAttempts(): Attempt[] | undefined {
  return useLiveQuery(() => listAttempts(), []);
}

export function useHasSubmittedProblem(problemId: string): boolean | undefined {
  return useLiveQuery(() => hasSubmittedProblem(problemId), [problemId]);
}
