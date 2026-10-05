import { describe, expect, it, vi } from "vitest";
import { getProblem } from "@/lib/problems/load";
import { weakUrlShortener } from "@/test/fixtures";
import { aiConfig, AiError, chatJson } from "./openrouter";
import { buildReviewPrompt } from "./prompt";
import { answerFollowUp, reviewAttempt } from "./review";
import { RUBRIC } from "./rubric";
import { ModelFollowUpSchema } from "@/lib/schema";

const problem = getProblem("url-shortener")!;
const config = {
  apiKey: "test-key",
  models: ["model/a:free", "model/b:free"],
  reasoningEffort: "low" as const,
};

/** A fake OpenRouter that replies with each given body in turn. */
type HttpReply = { status: number; body: unknown };
const isHttpReply = (r: unknown): r is HttpReply =>
  typeof r === "object" && r !== null && "status" in r;

function fakeFetch(...replies: unknown[]) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  let i = 0;
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    const r = replies[Math.min(i++, replies.length - 1)];
    if (isHttpReply(r)) return Response.json(r.body, { status: r.status });
    const content = typeof r === "string" ? r : JSON.stringify(r);
    return Response.json({ model: "model/a:free", choices: [{ message: { content } }] });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const goodReview = {
  scores: RUBRIC.map((r) => ({ dimension: r.dimension, score: 6, comment: "ok" })),
  strengths: ["Clear API"],
  issues: [
    {
      severity: "high",
      nodeIds: ["n4", "n99"],
      text: "Single Postgres instance under an HA requirement",
      fix: "Add replicas",
    },
    {
      severity: "high",
      nodeIds: ["n3", "n4"],
      text: "No cache on a 100:1 read path",
      fix: "Add Redis cache-aside",
    },
  ],
  missing: ["301 vs 302"],
  followUpQuestions: [
    "How do you avoid hot keys?",
    "What happens if Postgres fails?",
    "How are codes generated?",
  ],
};

describe("aiConfig", () => {
  it("is null without a key and builds a model list with fallbacks", () => {
    expect(aiConfig({})).toBeNull();
    expect(
      aiConfig({
        OPENROUTER_API_KEY: "k",
        REVIEW_MODEL: "x:free",
        REVIEW_FALLBACK_MODELS: " y:free, x:free ,,",
      }),
    ).toEqual({
      apiKey: "k",
      models: ["x:free", "y:free"],
      reasoningEffort: "low",
    });
    expect(aiConfig({ OPENROUTER_API_KEY: "k" })!.models[0]).toMatch(/:free$/);
    expect(
      aiConfig({ OPENROUTER_API_KEY: "k", REVIEW_REASONING_EFFORT: "NONE" })!.reasoningEffort,
    ).toBe("none");
    expect(
      aiConfig({ OPENROUTER_API_KEY: "k", REVIEW_REASONING_EFFORT: "max" })!.reasoningEffort,
    ).toBe("low");
  });
});

describe("chatJson", () => {
  const prompt = { system: "s", user: "u" };

  it("sends auth, the model list for fallbacks and JSON mode", async () => {
    const { impl, calls } = fakeFetch({ feedback: "good", scoreDelta: 2 });
    const res = await chatJson({ prompt, schema: ModelFollowUpSchema, config, fetchImpl: impl });
    expect(res.data).toEqual({ feedback: "good", scoreDelta: 2 });
    expect(calls[0].url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(calls[0].body).toMatchObject({
      model: "model/a:free",
      models: ["model/a:free", "model/b:free"],
      response_format: { type: "json_object" },
    });
    expect(calls[0].body.reasoning).toEqual({ effort: "low" });
    const headers = (impl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].headers;
    expect(headers.Authorization).toBe("Bearer test-key");
  });

  it("retries once with the validation error, then succeeds", async () => {
    const { impl, calls } = fakeFetch(
      "not json at all",
      '```json\n{"feedback":"fine","scoreDelta":"9"}\n```',
    );
    const res = await chatJson({ prompt, schema: ModelFollowUpSchema, config, fetchImpl: impl });
    expect(calls).toHaveLength(2);
    const retryMessages = calls[1].body.messages as { role: string; content: string }[];
    expect(retryMessages.at(-1)!.content).toMatch(/invalid/);
    // "9" is coerced and clamped to the +5 maximum
    expect(res.data.scoreDelta).toBe(5);
  });

  it("gives up after the retry", async () => {
    const { impl, calls } = fakeFetch({ nope: true });
    await expect(
      chatJson({ prompt, schema: ModelFollowUpSchema, config, fetchImpl: impl }),
    ).rejects.toMatchObject({ status: 502 });
    expect(calls).toHaveLength(2);
  });

  it("maps rate limits and bad keys to clear errors", async () => {
    const limited = fakeFetch({ status: 429, body: { error: { message: "rate limited" } } });
    await expect(
      chatJson({ prompt, schema: ModelFollowUpSchema, config, fetchImpl: limited.impl }),
    ).rejects.toMatchObject({
      status: 429,
      message: expect.stringMatching(/rate limit/i),
    });
    const badKey = fakeFetch({ status: 401, body: {} });
    await expect(
      chatJson({ prompt, schema: ModelFollowUpSchema, config, fetchImpl: badKey.impl }),
    ).rejects.toBeInstanceOf(AiError);
  });
});

describe("reviewAttempt", () => {
  it("computes the score, drops unknown node ids and records provenance", async () => {
    const { impl } = fakeFetch(goodReview);
    const review = await reviewAttempt(problem, weakUrlShortener(), { config, fetchImpl: impl });
    expect(review.overall).toBe(60);
    expect(review.level).toBe("mid");
    expect(review.issues[0].nodeIds).toEqual(["n4"]);
    expect(review.issues.filter((i) => i.severity === "high").flatMap((i) => i.nodeIds)).toEqual([
      "n4",
      "n3",
      "n4",
    ]);
    expect(review.model).toBe("model/a:free");
    expect(review.designHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("retries when a rubric dimension is missing", async () => {
    const partial = { ...goodReview, scores: goodReview.scores.slice(0, 3) };
    const { impl, calls } = fakeFetch(partial, goodReview);
    await reviewAttempt(problem, weakUrlShortener(), { config, fetchImpl: impl });
    expect(calls).toHaveLength(2);
  });

  it("sends the design, hidden requirements, lint and test results to the model", async () => {
    const { impl, calls } = fakeFetch(goodReview);
    await reviewAttempt(problem, weakUrlShortener(), { config, fetchImpl: impl });
    const user = (calls[0].body.messages as { content: string }[])[1].content;
    expect(user).toContain('n4 sql_db "Postgres"');
    expect(user).toContain("REFERENCE REQUIREMENTS");
    expect(user).toMatch(
      /\[warn\] Your requirements ask for high availability but Postgres \(n4\)/,
    );
    expect(user).toMatch(/\[warn\] Read:write is 100:1 but no cache/);
    expect(user).toMatch(/FAIL The redirect path can hit a cache/);
  });
});

describe("answerFollowUp", () => {
  it("returns feedback, a rounded delta and an optional next question", async () => {
    const { impl } = fakeFetch({ feedback: "Solid", scoreDelta: 2.6, nextQuestion: null });
    const res = await answerFollowUp(problem, weakUrlShortener(), "Q?", "A.", {
      config,
      fetchImpl: impl,
    });
    expect(res).toEqual({ feedback: "Solid", scoreDelta: 3 });
  });
});

describe("buildReviewPrompt", () => {
  it("tells the model not to reward matching the reference and to cite node ids", () => {
    const { system } = buildReviewPrompt(problem, weakUrlShortener(), [], []);
    expect(system).toMatch(/Alternative valid designs score fully/);
    expect(system).toMatch(/MUST list node ids/);
    expect(system).toMatch(/For something MISSING/);
  });
});
