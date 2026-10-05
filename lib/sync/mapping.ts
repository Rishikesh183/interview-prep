import { fromStored, graphHash, toStored } from "@/lib/graph/codec";
import {
  AttemptSchema,
  MySolutionSchema,
  type Attempt,
  type AttemptRow,
  type MySolution,
  type MySolutionRow,
  type Progress,
  type ProgressRow,
} from "@/lib/schema";

const iso = (ms: number) => new Date(ms).toISOString();
const ms = (s: string) => new Date(s).getTime();

/** Local attempt → Supabase row (compact graph + hash). `updated_at` carries the local edit time (LWW). */
export async function attemptToRow(a: Attempt, userId: string): Promise<AttemptRow> {
  const results = a.testRun?.results ?? [];
  return {
    id: a.id,
    user_id: userId,
    problem_id: a.problemId,
    status: a.status === "in_progress" ? "in_progress" : "submitted",
    started_at: iso(a.startedAt),
    submitted_at: a.submittedAt ? iso(a.submittedAt) : null,
    duration_sec: a.durationSec ?? null,
    requirements: a.requirements,
    estimation: a.estimation,
    entities: a.entities,
    apis: a.apis,
    graph: toStored(a.graph),
    graph_hash: await graphHash(a.graph, a.apis),
    tests_passed: a.testRun ? results.filter((r) => r.passed).length : null,
    tests_total: a.testRun ? results.length : null,
    hints_used: a.hintsRevealed,
    solution_viewed_before_submit: a.solutionViewedBeforeSubmit,
    points: a.points ?? null,
    client_state: {
      stage: a.stage,
      elapsedMs: a.elapsedMs,
      timerLimitMin: a.timerLimitMin,
      timerPaused: a.timerPaused,
      testRun: a.testRun,
      lint: a.lint,
      review: a.review,
      followUps: a.followUps,
      status: a.status,
    },
    updated_at: iso(a.updatedAt),
  };
}

/** Supabase row → local attempt, restoring catalog defaults and UI state. */
export function rowToAttempt(row: AttemptRow): Attempt {
  const cs = row.client_state ?? {};
  return AttemptSchema.parse({
    id: row.id,
    problemId: row.problem_id,
    startedAt: ms(row.started_at),
    updatedAt: ms(row.updated_at),
    submittedAt: row.submitted_at ? ms(row.submitted_at) : undefined,
    durationSec: row.duration_sec ?? undefined,
    status: cs.status ?? row.status,
    stage: cs.stage,
    elapsedMs: cs.elapsedMs,
    timerLimitMin: cs.timerLimitMin,
    timerPaused: cs.timerPaused,
    hintsRevealed: row.hints_used ?? 0,
    solutionViewedBeforeSubmit: row.solution_viewed_before_submit ?? false,
    points: row.points ?? undefined,
    requirements: row.requirements ?? undefined,
    estimation: row.estimation ?? undefined,
    entities: row.entities ?? [],
    apis: row.apis ?? [],
    graph: row.graph ? fromStored(row.graph) : { nodes: [], edges: [] },
    lint: cs.lint ?? [],
    testRun: cs.testRun,
    review: cs.review,
    followUps: cs.followUps ?? [],
  });
}

export const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export function progressToRow(p: Progress, userId: string): ProgressRow {
  return {
    user_id: userId,
    problem_id: p.problemId,
    best_points: p.bestPoints,
    best_ratio: p.bestRatio,
    solved_at: p.solvedAt !== undefined ? iso(p.solvedAt) : null,
  };
}

export function rowToProgress(row: ProgressRow, updatedAt: number): Progress {
  return {
    problemId: row.problem_id,
    bestPoints: row.best_points ?? 0,
    bestRatio: row.best_ratio ?? 0,
    ...(row.solved_at ? { solvedAt: ms(row.solved_at) } : {}),
    updatedAt,
  };
}

export function mySolutionToRow(s: MySolution, userId: string): MySolutionRow {
  return {
    id: s.id,
    user_id: userId,
    problem_id: s.problemId,
    title: s.title,
    graph: toStored(s.graph),
    apis: s.apis,
    entities: s.entities,
    notes: s.notes ?? null,
    created_at: iso(s.createdAt),
  };
}

/** A server row arrives already pushed (nothing to upload). */
export function rowToMySolution(row: MySolutionRow, now: number): MySolution {
  const created = row.created_at ? ms(row.created_at) : now;
  return MySolutionSchema.parse({
    id: row.id,
    problemId: row.problem_id,
    title: row.title || "Untitled",
    graph: row.graph ? fromStored(row.graph) : { nodes: [], edges: [] },
    apis: row.apis ?? [],
    entities: row.entities ?? [],
    notes: row.notes ?? undefined,
    createdAt: created,
    updatedAt: created,
    pushedAt: created,
  });
}
