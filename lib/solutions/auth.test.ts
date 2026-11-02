import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/components/auth/useAuth";
import { db } from "@/lib/db/dexie";
import { solutionsPeeked, markSolutionsPeeked } from "@/lib/db/mySolutions";
import { newAttempt } from "@/lib/db/attempts";
import { useAttemptStore } from "@/store/attempt";
import { solutionAccess } from "./access";
import { unlockAttemptSolutions, unlockProblemSolutions } from "./unlock";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/lib/supabase/browser", () => ({ supabaseBrowser: () => ({ auth: { getUser } }) }));
const user = { id: "11111111-1111-4111-8111-111111111111" } as User;
beforeEach(async () => {
  await Promise.all([
    db().meta.clear(),
    db().attempts.clear(),
    db().progress.clear(),
    db().mySolutions.clear(),
  ]);
  vi.clearAllMocks();
  useAuth.setState({ status: "signed-in", user });
  getUser.mockResolvedValue({ data: { user }, error: null });
  useAttemptStore.getState().load(newAttempt("url-shortener"));
});

describe("solutions require a live account", () => {
  it.each(["signed-out", "disabled"] as const)(
    "%s overrides every saved unlock/submission flag",
    (status) => {
      expect(solutionAccess(status, undefined, true)).toBe(false);
      expect(solutionAccess(status, user.id, true)).toBe(false);
      expect(solutionAccess(status, undefined, undefined)).toBe(false);
    },
  );
  it("doesn't reveal existing content while authentication is loading or missing a user", () => {
    expect(solutionAccess("loading", user.id, true)).toBeUndefined();
    expect(solutionAccess("signed-in", undefined, true)).toBe(false);
    expect(solutionAccess("signed-in", user.id, true)).toBe(true);
    expect(solutionAccess("signed-in", user.id, false)).toBe(false);
  });
  it.each(["signed-out", "loading", "disabled"] as const)(
    "blocks both unlock paths for %s",
    async (status) => {
      useAuth.setState({ status, user: null });
      const id = useAttemptStore.getState().meta!.id;
      await expect(unlockAttemptSolutions("url-shortener", id)).rejects.toThrow(/Sign in/);
      await expect(unlockProblemSolutions("url-shortener")).rejects.toThrow(/Sign in/);
      expect(getUser).not.toHaveBeenCalled();
      expect(useAttemptStore.getState().meta!.solutionViewedBeforeSubmit).toBe(false);
      expect(await solutionsPeeked("url-shortener")).toBe(false);
    },
  );
  it("rejects a stale UI sign-in when Supabase rejects the session", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(unlockProblemSolutions("url-shortener")).rejects.toThrow(/Sign in/);
    expect(await solutionsPeeked("url-shortener")).toBe(false);
  });
  it("blocks a sign-out or account change during verification", async () => {
    getUser.mockImplementation(async () => {
      useAuth.setState({ status: "signed-out", user: null });
      return { data: { user }, error: null };
    });
    await expect(unlockProblemSolutions("url-shortener")).rejects.toThrow(/Sign in/);
    expect(await solutionsPeeked("url-shortener")).toBe(false);
  });
  it("keeps the verified early-peek penalty for signed-in users", async () => {
    const id = useAttemptStore.getState().meta!.id;
    expect(await unlockAttemptSolutions("url-shortener", id)).toBe(true);
    expect(useAttemptStore.getState().meta!.solutionViewedBeforeSubmit).toBe(true);
    await unlockProblemSolutions("rate-limiter");
    expect(await solutionsPeeked("rate-limiter")).toBe(true);
  });
  it("doesn't unlock a different attempt opened during verification", async () => {
    const oldId = useAttemptStore.getState().meta!.id;
    getUser.mockImplementation(async () => {
      useAttemptStore.getState().load(newAttempt("url-shortener"));
      return { data: { user }, error: null };
    });
    expect(await unlockAttemptSolutions("url-shortener", oldId)).toBe(false);
    expect(useAttemptStore.getState().meta!.solutionViewedBeforeSubmit).toBe(false);
  });
  it("rolls back the peek and score penalty if authorization changes during the write", async () => {
    const attempt = newAttempt("url-shortener");
    await db().attempts.put(attempt);
    let checks = 0;
    await expect(
      markSolutionsPeeked("url-shortener", 10, () => {
        if (++checks === 2) throw new Error("Signed out");
      }),
    ).rejects.toThrow("Signed out");
    expect(await solutionsPeeked("url-shortener")).toBe(false);
    expect((await db().attempts.get(attempt.id))?.solutionViewedBeforeSubmit).toBe(false);
  });
});
