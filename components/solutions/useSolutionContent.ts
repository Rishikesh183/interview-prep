"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/useAuth";
import { fetchSolutionContent } from "@/lib/solutions/client";
import type { Problem } from "@/lib/schema";

export function useSolutionContent(problemId: string, enabled: boolean) {
  const { status, user } = useAuth();
  const userId = user?.id;
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    userId: string;
    problemId: string;
    problem?: Problem;
    error?: string;
  }>();
  useEffect(() => {
    if (!enabled || status !== "signed-in" || !userId) {
      setResult(undefined);
      return;
    }
    const controller = new AbortController();
    setResult(undefined);
    void fetchSolutionContent(problemId, userId, controller.signal).then(
      (problem) => {
        if (!controller.signal.aborted) setResult({ userId, problemId, problem });
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            userId,
            problemId,
            error: error instanceof Error ? error.message : "Couldn't load solutions.",
          });
      },
    );
    return () => controller.abort();
  }, [enabled, status, userId, problemId, retry]);
  const current =
    enabled &&
    status === "signed-in" &&
    result &&
    result.userId === userId &&
    result.problemId === problemId
      ? result
      : undefined;
  return { problem: current?.problem, error: current?.error, retry: () => setRetry((v) => v + 1) };
}
