import { describe, expect, it } from "vitest";
import type { Progress } from "@/lib/schema";
import {
  istDay,
  nextUp,
  pointsTotal,
  solvedByDifficulty,
  streak,
  topicMastery,
  type ProblemRef,
} from "./stats";

/** Seeded data (step 2.8 acceptance). */
const problems: ProblemRef[] = [
  { id: "a", number: 1, title: "A", difficulty: "easy", tags: ["caching", "ids"] },
  { id: "b", number: 2, title: "B", difficulty: "easy", tags: ["caching"] },
  { id: "c", number: 3, title: "C", difficulty: "medium", tags: ["queues"] },
  { id: "d", number: 4, title: "D", difficulty: "hard", tags: ["queues", "ids"] },
  { id: "e", number: 5, title: "E", difficulty: "medium", tags: ["geo"] },
];

const p = (
  problemId: string,
  bestPoints: number,
  bestRatio: number,
  solvedAt?: number,
): Progress => ({
  problemId,
  bestPoints,
  bestRatio,
  solvedAt,
  updatedAt: 0,
});

const progress = new Map(
  [p("a", 10, 1, 1), p("b", 5, 0.5), p("c", 20, 1, 2), p("e", 8, 0.4)].map((x) => [x.problemId, x]),
);

describe("progress stats", () => {
  it("totals points against the maximum", () => {
    expect(pointsTotal(problems, progress)).toEqual({
      earned: 43,
      possible: 10 + 10 + 20 + 40 + 20,
    });
  });

  it("counts solved by difficulty", () => {
    expect(solvedByDifficulty(problems, progress)).toEqual([
      { difficulty: "easy", solved: 1, total: 2 },
      { difficulty: "medium", solved: 1, total: 2 },
      { difficulty: "hard", solved: 0, total: 1 },
    ]);
  });

  it("averages best ratio per tag over all problems with it, weakest first", () => {
    expect(topicMastery(problems, progress)).toEqual([
      { tag: "geo", mastery: 0.4, solved: 0, total: 1 },
      { tag: "ids", mastery: 0.5, solved: 1, total: 2 },
      { tag: "queues", mastery: 0.5, solved: 1, total: 2 },
      { tag: "caching", mastery: 0.75, solved: 1, total: 2 },
    ]);
  });

  it("next up: easiest unsolved problem in the weakest tag", () => {
    expect(nextUp(problems, progress)).toMatchObject({ tag: "geo", problem: { id: "e" } });
    const geoDone = new Map(progress).set("e", p("e", 20, 1, 3));
    // ids and queues tie at 0.5 → alphabetical → ids → only unsolved is d.
    expect(nextUp(problems, geoDone)).toMatchObject({ tag: "ids", problem: { id: "d" } });
    const all = new Map(problems.map((x) => [x.id, p(x.id, 1, 1, 1)]));
    expect(nextUp(problems, all)).toBeNull();
  });

  it("nothing attempted: easiest problem of the biggest tag", () => {
    expect(nextUp(problems, new Map())).toMatchObject({ tag: "caching", problem: { id: "a" } });
  });
});

describe("streak (IST days)", () => {
  const IST = (s: string) => Date.parse(`${s}+05:30`);

  it("uses India time for day boundaries", () => {
    // 23:30 IST on the 5th is 18:00 UTC on the 5th; 00:30 IST on the 6th is still the 5th in UTC.
    expect(istDay(IST("2026-10-05T23:30:00"))).toBe("2026-10-05");
    expect(istDay(IST("2026-10-06T00:30:00"))).toBe("2026-10-06");
  });

  it("counts consecutive days, alive until the end of the next day", () => {
    const submits = [
      IST("2026-10-01T10:00:00"),
      IST("2026-10-03T09:00:00"),
      IST("2026-10-04T23:50:00"),
      IST("2026-10-05T00:10:00"),
      IST("2026-10-05T20:00:00"),
    ];
    expect(streak(submits, IST("2026-10-05T21:00:00"))).toEqual({ current: 3, longest: 3 });
    // Nothing yet today: yesterday's streak still counts.
    expect(streak(submits, IST("2026-10-06T08:00:00"))).toEqual({ current: 3, longest: 3 });
    // A full day missed: broken.
    expect(streak(submits, IST("2026-10-07T08:00:00"))).toEqual({ current: 0, longest: 3 });
    expect(streak([], 0)).toEqual({ current: 0, longest: 0 });
  });
});
