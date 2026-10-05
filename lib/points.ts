import type { Difficulty, Progress } from "@/lib/schema";

/** PHASE-2 §3. */
export const BASE_POINTS: Record<Difficulty, number> = { easy: 10, medium: 20, hard: 40 };
export const HINT_PENALTY = 0.25;

export type PointsInput = {
  difficulty: Difficulty;
  /** Weighted core + bonus tests passed ÷ total weight, 0–1. */
  ratio: number;
  hintsUsed: number;
  solutionViewedBeforeSubmit: boolean;
};

export type PointsBreakdown = {
  points: number;
  base: number;
  ratio: number;
  /** 1 − 0.25 × hints, floored at 0. */
  hintMultiplier: number;
  /** Zeroed because a solution was viewed before submitting. */
  forfeited: boolean;
};

/** points = round(base × ratio × max(0, 1 − 0.25 × hints)); 0 if a solution was viewed first. */
export function computePoints(i: PointsInput): PointsBreakdown {
  const base = BASE_POINTS[i.difficulty];
  const ratio = Math.min(1, Math.max(0, i.ratio));
  const hintMultiplier = Math.max(0, 1 - HINT_PENALTY * i.hintsUsed);
  const forfeited = i.solutionViewedBeforeSubmit;
  return {
    points: forfeited ? 0 : Math.round(base * ratio * hintMultiplier),
    base,
    ratio,
    hintMultiplier,
    forfeited,
  };
}

/**
 * Folds one submitted result into the stored best. Never lowers anything, so re-submitting a
 * worse attempt can't reduce progress (no farming, no accidental loss).
 */
export function mergeProgress(
  existing: Progress | undefined,
  result: { problemId: string; points: number; ratio: number; solved: boolean; at: number },
): Progress {
  const solvedAt = result.solved
    ? Math.min(existing?.solvedAt ?? Infinity, result.at)
    : existing?.solvedAt;
  return {
    problemId: result.problemId,
    bestPoints: Math.max(existing?.bestPoints ?? 0, result.points),
    bestRatio: Math.max(existing?.bestRatio ?? 0, result.ratio),
    ...(solvedAt !== undefined && Number.isFinite(solvedAt) ? { solvedAt } : {}),
    updatedAt: result.at,
    ...(existing?.pushedAt !== undefined ? { pushedAt: existing.pushedAt } : {}),
  };
}

/** Same rule for two copies of the same row (e.g. local vs server). */
export function maxProgress(a: Progress, b: Progress): Progress {
  const solved = [a.solvedAt, b.solvedAt].filter((x): x is number => x !== undefined);
  return {
    problemId: a.problemId,
    bestPoints: Math.max(a.bestPoints, b.bestPoints),
    bestRatio: Math.max(a.bestRatio, b.bestRatio),
    ...(solved.length ? { solvedAt: Math.min(...solved) } : {}),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
    ...(a.pushedAt !== undefined ? { pushedAt: a.pushedAt } : {}),
  };
}
