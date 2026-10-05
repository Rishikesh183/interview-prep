import "server-only";
import type { z } from "zod";
import { getProblem } from "@/lib/problems/load";
import type { Problem } from "@/lib/schema";
import { aiConfig, AiError, type AiConfig } from "./openrouter";

const json = (body: unknown, status = 200) => Response.json(body, { status });

/** Shared plumbing for AI route handlers: config check, body validation, problem lookup, errors. */
export async function handleAiRequest<S extends z.ZodType<{ problemId: string }>>(
  req: Request,
  schema: S,
  run: (body: z.infer<S>, problem: Problem, config: AiConfig) => Promise<unknown>,
): Promise<Response> {
  const config = aiConfig();
  if (!config) {
    return json(
      { error: "AI review isn't configured: set OPENROUTER_API_KEY in .env.local and restart." },
      503,
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request body." }, 400);

  const problem = getProblem(parsed.data.problemId);
  if (!problem) return json({ error: "Unknown problem." }, 404);

  try {
    return json(await run(parsed.data, problem, config));
  } catch (err) {
    if (err instanceof AiError) return json({ error: err.message }, err.status);
    console.error("AI request failed", err);
    return json({ error: "Unexpected error while contacting the model." }, 500);
  }
}
