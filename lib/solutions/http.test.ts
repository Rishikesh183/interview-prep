import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProblem, loadProblems } from "@/lib/problems/load";
import { publicProblem } from "@/lib/problems/public";
import { PublicProblemSchema, SolutionContentSchema } from "@/lib/schema";
import { solutionContentResponse } from "./http";

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: true }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: async () => ({ auth: { getUser } }) }));
const user = { id: "11111111-1111-4111-8111-111111111111" };
beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user }, error: null });
});

describe("reference content delivery", () => {
  it("redacts reference content from every public problem and solutions page payload", () => {
    for (const original of loadProblems()) {
      const practice = publicProblem(original);
      expect(practice.references).toEqual([]);
      expect(practice.functionalReqs).toEqual([]);
      expect(practice.nonFunctionalReqs).toEqual([]);
      expect(practice.deepDives).toEqual([]);
      expect(practice.rubricFocus).toEqual([]);
      expect(practice.tests).toEqual(original.tests);
      expect(practice.prompt).toBe(original.prompt);
      expect(
        PublicProblemSchema.safeParse({ ...practice, references: original.references }).success,
      ).toBe(false);
    }
  });
  it("refuses unauthenticated and invalid sessions without returning any answers", async () => {
    for (const identity of [
      { data: { user: null }, error: null },
      { data: { user }, error: { message: "expired" } },
    ]) {
      getUser.mockResolvedValue(identity);
      const response = await solutionContentResponse("url-shortener");
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Sign in to view solutions." });
    }
  });
  it("only returns full reference data for the verified identity, with private no-store headers", async () => {
    const response = await solutionContentResponse("url-shortener");
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toBe("Cookie");
    const content = SolutionContentSchema.parse(await response.json());
    expect(content.viewerId).toBe(user.id);
    expect(content.problem.references).toEqual(getProblem("url-shortener")!.references);
  });
  it("handles unknown questions and verification outages without exposing content", async () => {
    expect((await solutionContentResponse("missing")).status).toBe(404);
    getUser.mockRejectedValue(new Error("private backend detail"));
    const response = await solutionContentResponse("url-shortener");
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private backend detail");
  });
});
