import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { useAuth } from "@/components/auth/useAuth";
import { getProblem } from "@/lib/problems/load";
import { fetchSolutionContent } from "./client";

const user = { id: "11111111-1111-4111-8111-111111111111" } as User;
const problem = getProblem("url-shortener")!;
beforeEach(() => {
  useAuth.setState({ status: "signed-in", user });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("account-scoped solution loading", () => {
  it("does not fetch content for a signed-out user, even with old unlock history", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    useAuth.setState({ status: "signed-out", user: null });
    await expect(fetchSolutionContent(problem.id, user.id)).rejects.toThrow(/Sign in/);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects a response arriving after sign-out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        useAuth.setState({ status: "signed-out", user: null });
        return Response.json({ viewerId: user.id, problem });
      }),
    );
    await expect(fetchSolutionContent(problem.id, user.id)).rejects.toThrow(/Sign in/);
  });
  it("rejects content for another identity or problem", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ viewerId: "22222222-2222-4222-8222-222222222222", problem }),
      ),
    );
    await expect(fetchSolutionContent(problem.id, user.id)).rejects.toThrow(/session changed/);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ viewerId: user.id, problem: getProblem("rate-limiter") })),
    );
    await expect(fetchSolutionContent(problem.id, user.id)).rejects.toThrow(/session changed/);
  });
  it("fetches through the protected endpoint without caching and accepts verified content", async () => {
    const fetch = vi.fn(async () => Response.json({ viewerId: user.id, problem }));
    vi.stubGlobal("fetch", fetch);
    expect(await fetchSolutionContent(problem.id, user.id)).toEqual(problem);
    expect(fetch).toHaveBeenCalledWith(
      "/api/problems/url-shortener/solutions",
      expect.objectContaining({ cache: "no-store" }),
    );
  });
});
