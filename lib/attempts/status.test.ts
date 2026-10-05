import { describe, expect, it } from "vitest";
import { AttemptSchema, type Attempt } from "@/lib/schema";
import { formatDuration, isSolved, statusByProblem, testScore } from "./status";

const attempt = (over: Partial<Attempt>): Attempt =>
  AttemptSchema.parse({ id: "a", problemId: "p", startedAt: 0, updatedAt: 0, ...over });

const run = (...passed: boolean[]) => ({
  ranAt: 1,
  results: passed.map((p, i) => ({ id: `t${i}`, passed: p })),
});

describe("attempt status", () => {
  it("fills defaults for a fresh attempt", () => {
    const a = attempt({});
    expect(a).toMatchObject({
      status: "in_progress",
      stage: "requirements",
      elapsedMs: 0,
      timerLimitMin: 45,
    });
    expect(a.requirements.functional).toEqual([]);
    expect(a.estimation.peakFactor).toBe(3);
  });

  it("scores test runs", () => {
    expect(testScore(attempt({}))).toBeNull();
    expect(testScore(attempt({ testRun: run(true, false, true) }))).toEqual({
      passed: 2,
      total: 3,
    });
  });

  it("is solved only when submitted and all tests pass", () => {
    expect(isSolved(attempt({ testRun: run(true, true) }))).toBe(false);
    expect(isSolved(attempt({ status: "submitted", testRun: run(true, false) }))).toBe(false);
    expect(isSolved(attempt({ status: "submitted", testRun: run(true, true) }))).toBe(true);
  });

  it("rolls attempts up per problem, solved wins", () => {
    const map = statusByProblem([
      attempt({ id: "1", problemId: "a" }),
      attempt({ id: "2", problemId: "b", status: "submitted", testRun: run(true) }),
      attempt({ id: "3", problemId: "b" }),
    ]);
    expect(map.get("a")).toBe("attempted");
    expect(map.get("b")).toBe("solved");
    expect(map.get("c")).toBeUndefined();
  });

  it.each([
    [0, "0:00"],
    [65_000, "1:05"],
    [45 * 60_000, "45:00"],
    [3_725_000, "1:02:05"],
  ])("formatDuration(%d) = %s", (ms, s) => expect(formatDuration(ms)).toBe(s));
});
