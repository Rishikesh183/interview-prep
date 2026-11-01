import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/components/auth/useAuth";
import * as solutionDb from "@/lib/db/mySolutions";
import { getProgress } from "@/lib/db/progress";
import { db } from "@/lib/db/dexie";
import { getProblem } from "@/lib/problems/load";
import { AttemptSchema, type Graph } from "@/lib/schema";
import { useAttemptStore } from "@/store/attempt";
import { submitAttempt } from "./actions";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/lib/supabase/browser", () => ({ supabaseBrowser: () => ({ auth: { getUser } }) }));
const user = { id: "11111111-1111-4111-8111-111111111111" } as User;

const problem = getProblem("url-shortener")!; // easy: 10 base points
const reference = problem.references.find((r) => r.graph)!;

/** Loads an attempt into the stores, as the workspace does. */
function startAttempt(design: {
  graph: Graph;
  apis: typeof reference.apis;
  entities: typeof reference.entities;
}) {
  useAttemptStore.getState().load(
    AttemptSchema.parse({
      id: crypto.randomUUID(),
      problemId: problem.id,
      startedAt: 0,
      updatedAt: 0,
      ...design,
      // The reference's notes mention 301/302, so even the bonus test passes.
    }),
  );
}

const full = () => ({
  graph: reference.graph!,
  apis: reference.apis,
  entities: reference.entities,
});
const weak = () => ({
  graph: { nodes: reference.graph!.nodes.slice(0, 2), edges: [] },
  apis: [],
  entities: [],
});

beforeEach(async () => {
  await Promise.all([db().progress.clear(), db().attempts.clear(), db().meta.clear()]);
  useAuth.setState({ status: "signed-in", user });
  getUser.mockReset().mockResolvedValue({ data: { user }, error: null });
});
afterEach(() => vi.restoreAllMocks());

describe("submission authentication", () => {
  it.each(["signed-out", "loading", "disabled"] as const)(
    "blocks %s users without locking or scoring",
    async (status) => {
      startAttempt(full());
      useAuth.setState({ status, user: null });
      await expect(submitAttempt(problem)).rejects.toThrow(/Sign in to submit/);
      expect(useAttemptStore.getState().meta?.status).toBe("in_progress");
      expect(useAttemptStore.getState().meta?.testRun).toBeUndefined();
      expect(await getProgress(problem.id)).toBeUndefined();
      expect(getUser).not.toHaveBeenCalled();
    },
  );

  it("rejects a missing server-verified session even if the UI looks signed in", async () => {
    startAttempt(full());
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(submitAttempt(problem)).rejects.toThrow(/Sign in/);
    expect(useAttemptStore.getState().meta?.status).toBe("in_progress");
  });

  it("retains an editable draft when auth cannot be reached", async () => {
    startAttempt(full());
    getUser.mockRejectedValue(new Error("offline"));
    await expect(submitAttempt(problem)).rejects.toThrow(/Check your connection/);
    expect(useAttemptStore.getState().meta?.status).toBe("in_progress");
    expect(await getProgress(problem.id)).toBeUndefined();
  });

  it("blocks sign-out during an asynchronous submission check", async () => {
    startAttempt(full());
    vi.spyOn(solutionDb, "forfeitsPoints").mockImplementation(async () => {
      useAuth.setState({ status: "signed-out", user: null });
      return false;
    });
    await expect(submitAttempt(problem)).rejects.toThrow(/Sign in/);
    expect(useAttemptStore.getState().meta?.status).toBe("in_progress");
    expect(await getProgress(problem.id)).toBeUndefined();
  });

  it("does not submit a different attempt opened while session verification was pending", async () => {
    startAttempt(full());
    getUser.mockImplementation(async () => {
      startAttempt(weak());
      return { data: { user }, error: null };
    });
    expect(await submitAttempt(problem)).toBeNull();
    expect(useAttemptStore.getState().meta?.status).toBe("in_progress");
  });
});

describe("points & gating (step 2.5 acceptance)", () => {
  it("a full-marks design earns the base points and counts as solved", async () => {
    startAttempt(full());
    const result = await submitAttempt(problem);
    expect(result).toMatchObject({ points: 10, base: 10, forfeited: false });
    expect(useAttemptStore.getState().meta).toMatchObject({ status: "submitted", points: 10 });
    expect(await getProgress(problem.id)).toMatchObject({ bestPoints: 10, bestRatio: 1 });
  });

  it("viewing a solution before submitting scores 0", async () => {
    startAttempt(full());
    useAttemptStore.getState().unlockSolutions();
    const result = await submitAttempt(problem);
    expect(result).toMatchObject({ points: 0, forfeited: true });
    expect((await getProgress(problem.id))?.bestPoints).toBe(0);
  });

  it("hints cost 25% each", async () => {
    startAttempt(full());
    useAttemptStore.getState().revealHint();
    expect((await submitAttempt(problem))?.points).toBe(8); // round(10 × 1 × 0.75)
  });

  it("a lower re-submit never reduces best_points", async () => {
    startAttempt(full());
    await submitAttempt(problem);
    startAttempt(weak());
    const worse = await submitAttempt(problem);
    expect(worse!.points).toBeLessThan(10);
    expect(await getProgress(problem.id)).toMatchObject({ bestPoints: 10, bestRatio: 1 });
  });

  it("can't submit twice", async () => {
    startAttempt(full());
    await submitAttempt(problem);
    expect(await submitAttempt(problem)).toBeNull();
  });
});
