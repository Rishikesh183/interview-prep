import { afterEach, describe, expect, it, vi } from "vitest";
import { RUBRIC } from "@/lib/ai/rubric";
import { weakUrlShortener } from "@/test/fixtures";
import { POST } from "./route";

const req = (body: unknown) =>
  new Request("http://localhost/api/review", { method: "POST", body: JSON.stringify(body) });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/review", () => {
  it("503s with a helpful message when no key is configured", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const res = await POST(req({ problemId: "url-shortener", attempt: weakUrlShortener() }));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/OPENROUTER_API_KEY/);
  });

  it("400s on a bad body and 404s on an unknown problem", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    expect((await POST(req({ nope: 1 }))).status).toBe(400);
    expect((await POST(req({ problemId: "nope", attempt: weakUrlShortener() }))).status).toBe(404);
  });

  it("returns a validated review", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "k");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          model: "m:free",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  scores: RUBRIC.map((r) => ({ dimension: r.dimension, score: 4, comment: "x" })),
                  strengths: [],
                  issues: [
                    { severity: "high", nodeIds: ["n4"], text: "Single DB", fix: "Replicate" },
                  ],
                  missing: [],
                  followUpQuestions: ["Why?"],
                }),
              },
            },
          ],
        }),
      ),
    );
    const res = await POST(req({ problemId: "url-shortener", attempt: weakUrlShortener() }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ overall: 40, level: "junior", model: "m:free" });
  });
});
