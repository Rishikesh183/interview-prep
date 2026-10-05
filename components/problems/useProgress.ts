"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { listProgress } from "@/lib/db/progress";
import type { Progress } from "@/lib/schema";

/** Live best-result-per-problem map; `undefined` while loading. */
export function useProgress(): Map<string, Progress> | undefined {
  return useLiveQuery(async () => new Map((await listProgress()).map((p) => [p.problemId, p])), []);
}
