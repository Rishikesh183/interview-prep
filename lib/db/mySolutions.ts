import { MySolutionSchema, type Attempt, type MySolution } from "@/lib/schema";
import { db } from "./dexie";

function parse(row: unknown): MySolution | null {
  const res = MySolutionSchema.safeParse(row);
  return res.success ? res.data : null;
}

/** Saved solutions for a problem (newest first), excluding ones waiting to be deleted. */
export async function listMySolutions(problemId: string): Promise<MySolution[]> {
  const rows = await db().mySolutions.where("problemId").equals(problemId).toArray();
  return rows
    .map(parse)
    .filter((s): s is MySolution => s !== null && s.deletedAt === undefined)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Saves a submitted attempt's design under a name. */
export async function saveMySolution(
  attempt: Attempt,
  title: string,
  now = Date.now(),
): Promise<MySolution> {
  if (attempt.status === "in_progress") throw new Error("Only submitted designs can be saved");
  const solution = MySolutionSchema.parse({
    id: crypto.randomUUID(),
    problemId: attempt.problemId,
    title: title.trim() || "Untitled",
    graph: attempt.graph,
    apis: attempt.apis,
    entities: attempt.entities,
    attemptId: attempt.id,
    createdAt: now,
    updatedAt: now,
  });
  await db().mySolutions.put(solution);
  return solution;
}

export async function renameMySolution(id: string, title: string): Promise<void> {
  await db().mySolutions.update(id, { title: title.trim() || "Untitled", updatedAt: Date.now() });
}

/** Never-synced rows go at once; synced ones are marked so the server copy is deleted too. */
export async function deleteMySolution(id: string): Promise<void> {
  const d = db();
  const row = await d.mySolutions.get(id);
  if (!row) return;
  if (row.pushedAt === undefined) await d.mySolutions.delete(id);
  else await d.mySolutions.update(id, { deletedAt: Date.now() });
}

// ---- "Unlock anyway" without an attempt open (PHASE-2 §3) ----

const peekKey = (problemId: string) => `peek:${problemId}`;

/** Remembers that solutions were opened before this problem was ever submitted. */
export async function markSolutionsPeeked(problemId: string, now = Date.now()): Promise<void> {
  const d = db();
  await d.meta.put({ key: peekKey(problemId), value: String(now) });
  // The attempt in progress (if any) scores 0 from now on.
  const open = (await d.attempts.where("problemId").equals(problemId).toArray())
    .filter((a) => a.status === "in_progress")
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  if (open && !open.solutionViewedBeforeSubmit) {
    await d.attempts.put({ ...open, solutionViewedBeforeSubmit: true, updatedAt: now });
  }
}

export async function solutionsPeeked(problemId: string): Promise<boolean> {
  return (await db().meta.get(peekKey(problemId))) !== undefined;
}

/**
 * Whether an attempt submitted now forfeits its points: it saw the solutions itself, or they
 * were peeked at (from the solutions page) before this problem was ever submitted.
 */
export async function forfeitsPoints(attempt: Attempt): Promise<boolean> {
  if (attempt.solutionViewedBeforeSubmit) return true;
  if (!(await solutionsPeeked(attempt.problemId))) return false;
  const others = await db().attempts.where("problemId").equals(attempt.problemId).toArray();
  return !others.some((a) => a.id !== attempt.id && a.status !== "in_progress");
}
