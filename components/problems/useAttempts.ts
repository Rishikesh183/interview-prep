"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { listAttempts } from "@/lib/db/attempts";
import type { Attempt } from "@/lib/schema";

/** Live list of all attempts (newest first); `undefined` while loading. */
export function useAttempts(): Attempt[] | undefined {
  return useLiveQuery(() => listAttempts(), []);
}
