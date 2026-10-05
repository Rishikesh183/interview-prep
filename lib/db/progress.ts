import { mergeProgress } from "@/lib/points";
import { ProgressSchema, type Progress } from "@/lib/schema";
import { db } from "./dexie";

export async function listProgress(): Promise<Progress[]> {
  return (await db().progress.toArray()).flatMap((row) => {
    const parsed = ProgressSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function getProgress(problemId: string): Promise<Progress | undefined> {
  const parsed = ProgressSchema.safeParse(await db().progress.get(problemId));
  return parsed.success ? parsed.data : undefined;
}

/** Folds a submitted result into the best-so-far (never lowers it). */
export async function recordResult(result: {
  problemId: string;
  points: number;
  ratio: number;
  solved: boolean;
  at: number;
}): Promise<Progress> {
  const d = db();
  return d.transaction("rw", d.progress, async () => {
    const next = mergeProgress(await getProgress(result.problemId), result);
    await d.progress.put(next);
    return next;
  });
}
