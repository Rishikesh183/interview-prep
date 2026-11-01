import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { weakUrlShortener } from "@/test/fixtures";
import { db } from "./dexie";
import { hasSubmittedProblem } from "./attempts";
import { recordResult } from "./progress";
import { forfeitsPoints, markSolutionsPeeked, saveMySolution } from "./mySolutions";

beforeEach(async () => {
  const d = db();
  await Promise.all([
    d.attempts.clear(),
    d.meta.clear(),
    d.mySolutions.clear(),
    d.progress.clear(),
  ]);
});

const attempt = (over = {}) => ({
  ...weakUrlShortener(),
  id: crypto.randomUUID(),
  status: "in_progress" as const,
  ...over,
});

describe("unlock anyway from the solutions page", () => {
  it("recognizes a synced submission even when no attempt history exists here", async () => {
    await db().progress.put({
      problemId: "url-shortener",
      bestPoints: 0,
      bestRatio: 0,
      updatedAt: 100,
      pushedAt: 100,
    });
    expect(await db().attempts.count()).toBe(0);
    expect(await hasSubmittedProblem("url-shortener")).toBe(true);
    expect(await hasSubmittedProblem("rate-limiter")).toBe(false);
    await markSolutionsPeeked("url-shortener");
    expect(await forfeitsPoints(attempt())).toBe(false);
  });

  it("deleting local history does not relock a previously submitted problem", async () => {
    await recordResult({
      problemId: "url-shortener",
      points: 8,
      ratio: 0.8,
      solved: false,
      at: 100,
    });
    await db().attempts.clear();
    expect(await hasSubmittedProblem("url-shortener")).toBe(true);
  });
  it("flags the attempt in progress and any new attempt until the first submit", async () => {
    const open = attempt();
    await db().attempts.put(open);
    expect(await forfeitsPoints(open)).toBe(false);

    await markSolutionsPeeked(open.problemId);
    expect((await db().attempts.get(open.id))?.solutionViewedBeforeSubmit).toBe(true);
    // An attempt loaded before the peek (stale flag) still forfeits.
    expect(await forfeitsPoints(open)).toBe(true);
    expect(await forfeitsPoints(attempt())).toBe(true);

    // Once something was submitted, solutions are unlocked anyway: later attempts score.
    await db().attempts.put(attempt({ status: "submitted" }));
    expect(await forfeitsPoints(attempt())).toBe(false);
  });

  it("doesn't touch other problems", async () => {
    await markSolutionsPeeked("rate-limiter");
    expect(await forfeitsPoints(attempt())).toBe(false);
  });
});

describe("my solutions", () => {
  it("only saves submitted designs", async () => {
    await expect(saveMySolution(attempt(), "x")).rejects.toThrow();
    const s = await saveMySolution(attempt({ status: "submitted" }), "  ");
    expect(s.title).toBe("Untitled");
  });
});
