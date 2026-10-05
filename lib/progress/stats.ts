import { BASE_POINTS } from "@/lib/points";
import type { Difficulty, Progress, ProblemSummary } from "@/lib/schema";

/** Everything on /progress, computed from local data with pure functions (PHASE-2 §10, 2.8). */

export type ProblemRef = Pick<ProblemSummary, "id" | "number" | "title" | "difficulty" | "tags">;

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

export const solved = (p: Progress | undefined) => p?.solvedAt !== undefined;

export function pointsTotal(problems: ProblemRef[], progress: Map<string, Progress>) {
  return {
    earned: problems.reduce((s, p) => s + (progress.get(p.id)?.bestPoints ?? 0), 0),
    possible: problems.reduce((s, p) => s + BASE_POINTS[p.difficulty], 0),
  };
}

export function solvedByDifficulty(problems: ProblemRef[], progress: Map<string, Progress>) {
  return DIFFICULTIES.map((difficulty) => {
    const of = problems.filter((p) => p.difficulty === difficulty);
    return {
      difficulty,
      solved: of.filter((p) => solved(progress.get(p.id))).length,
      total: of.length,
    };
  });
}

/** Calendar day (YYYY-MM-DD) in India time. */
export function istDay(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(ms));
}

const dayNumber = (day: string) =>
  Date.UTC(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10)) / 86_400_000;

/**
 * Consecutive IST days with at least one submit. The current streak is still alive if the last
 * submit was yesterday (today isn't over yet).
 */
export function streak(submitTimes: number[], now: number): { current: number; longest: number } {
  const days = [...new Set(submitTimes.map((t) => dayNumber(istDay(t))))].sort((a, b) => a - b);
  if (!days.length) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    run = days[i] === days[i - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const today = dayNumber(istDay(now));
  const last = days[days.length - 1];
  if (last < today - 1) return { current: 0, longest };
  let current = 1;
  for (let i = days.length - 1; i > 0 && days[i - 1] === days[i] - 1; i--) current++;
  return { current, longest };
}

export type TagMastery = { tag: string; mastery: number; solved: number; total: number };

/** Average best ratio per tag over every problem with that tag (unattempted = 0). Weakest first. */
export function topicMastery(
  problems: ProblemRef[],
  progress: Map<string, Progress>,
): TagMastery[] {
  const byTag = new Map<string, ProblemRef[]>();
  for (const p of problems) for (const t of p.tags) byTag.set(t, [...(byTag.get(t) ?? []), p]);
  return [...byTag.entries()]
    .map(([tag, ps]) => ({
      tag,
      mastery: ps.reduce((s, p) => s + (progress.get(p.id)?.bestRatio ?? 0), 0) / ps.length,
      solved: ps.filter((p) => solved(progress.get(p.id))).length,
      total: ps.length,
    }))
    .sort((a, b) => a.mastery - b.mastery || b.total - a.total || a.tag.localeCompare(b.tag));
}

/**
 * "Next up": an unsolved problem from the weakest tag that still has one, easiest first.
 * Ties between equally weak tags go to the tag with more problems (more practice value).
 */
export function nextUp(
  problems: ProblemRef[],
  progress: Map<string, Progress>,
): { problem: ProblemRef; tag: string } | null {
  for (const { tag } of topicMastery(problems, progress)) {
    const candidates = problems
      .filter((p) => p.tags.includes(tag) && !solved(progress.get(p.id)))
      .sort((a, b) => RANK[a.difficulty] - RANK[b.difficulty] || a.number - b.number);
    if (candidates.length) return { problem: candidates[0], tag };
  }
  return null;
}
