import { describe, expect, it, vi } from "vitest";
import { getProblem } from "@/lib/problems/load";
import type { Attempt } from "@/lib/schema";
import { weakUrlShortener } from "@/test/fixtures";
import { budgetDay, BudgetExceededError, dailyLimit, memoryUsageStore } from "./budget";
import { prefixMessage } from "./openrouter";
import { memoryReviewCache } from "./reviewCache";
import { RUBRIC } from "./rubric";
import { budgetedFollowUp, cachedReview } from "./service";

const problem = getProblem("url-shortener")!;
const config = { apiKey: "k", models: ["model/a:free"], reasoningEffort: "low" as const };
const USER = "11111111-1111-4111-8111-111111111111";

const review = {
  scores: RUBRIC.map((r) => ({ dimension: r.dimension, score: 7, comment: "ok" })),
  strengths: [],
  issues: [],
  missing: [],
  followUpQuestions: ["Why?"],
};

/** Fake OpenRouter: always a valid review (or follow-up) with token usage. */
function openRouter(content: unknown = review) {
  const impl = vi.fn(async () =>
    Response.json({
      model: "model/a:free",
      choices: [{ message: { content: JSON.stringify(content) } }],
      usage: { prompt_tokens: 1200, completion_tokens: 300 },
    }),
  );
  return impl as unknown as typeof fetch & typeof impl;
}

function setup(limit = 10) {
  const usage = memoryUsageStore();
  const fetchImpl = openRouter();
  const deps = {
    config,
    cache: memoryReviewCache(),
    budget: { store: usage.store, userId: USER, limit },
    fetchImpl,
  };
  return { usage, fetchImpl, deps };
}

const variant = (i: number): Attempt => {
  const a = weakUrlShortener();
  return { ...a, entities: [...a.entities, { name: `Extra${i}`, fields: "id" }] };
};

describe("AI judge budget & cache (step 2.7 acceptance)", () => {
  it("a second review of an unchanged design makes 0 API calls and uses no budget", async () => {
    const { usage, fetchImpl, deps } = setup();
    const first = await cachedReview(problem, weakUrlShortener(), "standard", deps);
    expect(first.cached).toBeUndefined();
    const second = await cachedReview(problem, weakUrlShortener(), "standard", deps);
    expect(second).toMatchObject({ cached: true, overall: first.overall });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(await usage.store.used(USER, budgetDay())).toBe(1);
  });

  it("moving a node doesn't count as a change", async () => {
    const { fetchImpl, deps } = setup();
    await cachedReview(problem, weakUrlShortener(), "standard", deps);
    const moved = weakUrlShortener();
    moved.graph.nodes[0] = { ...moved.graph.nodes[0], position: { x: 999, y: -40 } };
    await cachedReview(problem, moved, "standard", deps);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("the 11th call of the day is refused with a clear message", async () => {
    const { usage, fetchImpl, deps } = setup(dailyLimit({}));
    for (let i = 0; i < 10; i++) await cachedReview(problem, variant(i), "standard", deps);
    const eleventh = cachedReview(problem, variant(10), "standard", deps);
    await expect(eleventh).rejects.toBeInstanceOf(BudgetExceededError);
    await expect(eleventh).rejects.toMatchObject({
      status: 429,
      message: expect.stringMatching(/all 10 AI calls for today/),
    });
    expect(fetchImpl).toHaveBeenCalledTimes(10);
    // Cached reviews still work when the budget is spent.
    await expect(cachedReview(problem, variant(3), "standard", deps)).resolves.toMatchObject({
      cached: true,
    });
    const row = usage.rows.get(`${USER}|${budgetDay()}`)!;
    expect(row).toEqual({ calls: 10, inputTokens: 12_000, outputTokens: 3_000 });
  });

  it("a failed model call gives the budget back", async () => {
    const { usage, deps } = setup();
    const failing = vi.fn(async () => Response.json({}, { status: 500 }));
    await expect(
      cachedReview(problem, weakUrlShortener(), "standard", {
        ...deps,
        fetchImpl: failing as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ status: 502 });
    expect(await usage.store.used(USER, budgetDay())).toBe(0);
  });

  it("without a budget (local-only) calls are not counted", async () => {
    const { fetchImpl, deps } = setup();
    await cachedReview(problem, variant(1), "standard", { ...deps, budget: null });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("follow-ups are budgeted and capped at 3 per attempt", async () => {
    const { usage, deps } = setup();
    const fetchImpl = openRouter({ feedback: "ok", scoreDelta: 1 });
    const attempt = weakUrlShortener();
    await budgetedFollowUp(problem, attempt, "Q", "A", { ...deps, fetchImpl });
    expect(await usage.store.used(USER, budgetDay())).toBe(1);

    const followUp = { question: "Q", answer: "A", feedback: "ok", scoreDelta: 0 };
    const full = { ...attempt, followUps: [followUp, followUp, followUp] };
    await expect(
      budgetedFollowUp(problem, full, "Q", "A", { ...deps, fetchImpl }),
    ).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/3 follow-up/) });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("deep and standard reviews are cached separately (different models)", async () => {
    const { fetchImpl, deps } = setup();
    await cachedReview(problem, weakUrlShortener(), "standard", deps);
    const deep = await cachedReview(problem, weakUrlShortener(), "deep", {
      ...deps,
      config: { ...config, models: ["model/deep"] },
    });
    expect(deep.tier).toBe("deep");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

describe("budget day", () => {
  it("rolls over at midnight IST, not UTC", () => {
    expect(budgetDay(new Date("2026-10-05T18:29:00Z"))).toBe("2026-10-05");
    expect(budgetDay(new Date("2026-10-05T18:31:00Z"))).toBe("2026-10-06");
  });

  it("reads DAILY_AI_CALLS with a default of 10", () => {
    expect(dailyLimit({})).toBe(10);
    expect(dailyLimit({ DAILY_AI_CALLS: "3" })).toBe(3);
    expect(dailyLimit({ DAILY_AI_CALLS: "lots" })).toBe(10);
  });
});

describe("cached prompt prefix", () => {
  const prompt = { system: "S", context: "PROBLEM", user: "DESIGN" };
  it("marks the problem context as a cache breakpoint for Anthropic/Gemini models", () => {
    expect(prefixMessage(prompt, "anthropic/claude-haiku-4.5").content).toEqual([
      { type: "text", text: "S" },
      { type: "text", text: "PROBLEM", cache_control: { type: "ephemeral" } },
    ]);
  });
  it("sends one plain prefix string to providers that cache automatically", () => {
    expect(prefixMessage(prompt, "openai/gpt-oss-120b:free").content).toBe("S\n\nPROBLEM");
  });
});
