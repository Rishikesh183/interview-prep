import { describe, expect, it } from "vitest";
import { computePoints, maxProgress, mergeProgress } from "./points";

const input = {
  difficulty: "medium" as const,
  ratio: 1,
  hintsUsed: 0,
  solutionViewedBeforeSubmit: false,
};

describe("computePoints", () => {
  it("uses base by difficulty × weighted ratio", () => {
    expect(computePoints({ ...input, difficulty: "easy" }).points).toBe(10);
    expect(computePoints(input).points).toBe(20);
    expect(computePoints({ ...input, difficulty: "hard", ratio: 0.75 }).points).toBe(30);
  });

  it("takes 25% per hint, never below zero", () => {
    expect(computePoints({ ...input, hintsUsed: 1 }).points).toBe(15);
    expect(computePoints({ ...input, hintsUsed: 2, ratio: 0.5 }).points).toBe(5);
    expect(computePoints({ ...input, hintsUsed: 5 })).toMatchObject({
      points: 0,
      hintMultiplier: 0,
    });
  });

  it("is 0 when a solution was viewed before submitting", () => {
    expect(computePoints({ ...input, solutionViewedBeforeSubmit: true })).toMatchObject({
      points: 0,
      forfeited: true,
    });
  });
});

describe("progress", () => {
  const at = 1_000;
  it("a lower re-submit never reduces best points or ratio", () => {
    const first = mergeProgress(undefined, {
      problemId: "p",
      points: 18,
      ratio: 0.9,
      solved: true,
      at,
    });
    const worse = mergeProgress(first, {
      problemId: "p",
      points: 5,
      ratio: 0.4,
      solved: false,
      at: at + 1,
    });
    expect(worse).toMatchObject({ bestPoints: 18, bestRatio: 0.9, solvedAt: at });
  });

  it("a better re-submit raises it; solvedAt keeps the first solve", () => {
    const first = mergeProgress(undefined, {
      problemId: "p",
      points: 5,
      ratio: 0.5,
      solved: false,
      at,
    });
    expect(first.solvedAt).toBeUndefined();
    const better = mergeProgress(first, {
      problemId: "p",
      points: 20,
      ratio: 1,
      solved: true,
      at: at + 5,
    });
    expect(better).toMatchObject({ bestPoints: 20, bestRatio: 1, solvedAt: at + 5 });
  });

  it("merges two copies (local vs server) by taking the best of each field", () => {
    const local = { problemId: "p", bestPoints: 10, bestRatio: 0.9, updatedAt: 5, pushedAt: 2 };
    const remote = { problemId: "p", bestPoints: 20, bestRatio: 0.5, solvedAt: 3, updatedAt: 4 };
    expect(maxProgress(local, remote)).toEqual({
      problemId: "p",
      bestPoints: 20,
      bestRatio: 0.9,
      solvedAt: 3,
      updatedAt: 5,
      pushedAt: 2,
    });
  });
});
