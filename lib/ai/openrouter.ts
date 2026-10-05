import "server-only";
import type { z } from "zod";
import { extractJson } from "./json";
import type { ChatPrompt } from "./prompt";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 120_000;
const DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

export class AiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type ReasoningEffort = "low" | "medium" | "high" | "none";
export type AiConfig = { apiKey: string; models: string[]; reasoningEffort: ReasoningEffort };
export type ReviewTier = "standard" | "deep";
export type TokenUsage = { inputTokens: number; outputTokens: number };

const EFFORTS: ReasoningEffort[] = ["low", "medium", "high", "none"];

/** Reads env at call time (server only). Returns null when no key is configured. */
export function aiConfig(env: Record<string, string | undefined> = process.env): AiConfig | null {
  const apiKey = env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;
  const primary = env.REVIEW_MODEL?.trim() || DEFAULT_MODEL;
  const fallbacks = (env.REVIEW_FALLBACK_MODELS ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m && m !== primary);
  // Free reasoning models can think for minutes at their default effort; "low" keeps reviews ~15-40s.
  const effort = env.REVIEW_REASONING_EFFORT?.trim().toLowerCase() as ReasoningEffort | undefined;
  const reasoningEffort = effort && EFFORTS.includes(effort) ? effort : "low";
  return { apiKey, models: [primary, ...fallbacks], reasoningEffort };
}

/** "Deep review" uses DEEP_REVIEW_MODEL on its own (no silent fallback to the cheap models). */
export function deepAiConfig(
  env: Record<string, string | undefined> = process.env,
): AiConfig | null {
  const base = aiConfig(env);
  const model = env.DEEP_REVIEW_MODEL?.trim();
  return base && model ? { ...base, models: [model] } : null;
}

export const configForTier = (tier: ReviewTier, env?: Record<string, string | undefined>) =>
  tier === "deep" ? deepAiConfig(env) : aiConfig(env);

type TextPart = { type: "text"; text: string; cache_control?: { type: "ephemeral" } };
type Message = { role: "system" | "user" | "assistant"; content: string | TextPart[] };

/** Providers that need an explicit breakpoint; others (OpenAI, DeepSeek...) cache prefixes on their own. */
const explicitCache = (model: string) => /^(anthropic|google)\//.test(model);

/** System prompt + problem context first, marked cacheable, so repeat reviews reuse the prefix. */
export function prefixMessage(prompt: ChatPrompt, model: string): Message {
  if (!prompt.context) return { role: "system", content: prompt.system };
  if (!explicitCache(model))
    return { role: "system", content: `${prompt.system}\n\n${prompt.context}` };
  return {
    role: "system",
    content: [
      { type: "text", text: prompt.system },
      { type: "text", text: prompt.context, cache_control: { type: "ephemeral" } },
    ],
  };
}

type Options<S extends z.ZodType> = {
  prompt: ChatPrompt;
  schema: S;
  config: AiConfig;
  maxTokens?: number;
  fetchImpl?: typeof fetch;
  /** Called with the tokens used (summed over the retry), for the ai_usage log. */
  onUsage?: (usage: TokenUsage) => void;
};

function upstreamError(status: number, detail: string): AiError {
  if (status === 401)
    return new AiError("OpenRouter rejected the API key (OPENROUTER_API_KEY).", 401);
  if (status === 402)
    return new AiError("OpenRouter says the account needs credits for this model.", 402);
  if (status === 429) {
    return new AiError(
      "Free-tier rate limit reached on OpenRouter. Wait a minute and try again, or set REVIEW_FALLBACK_MODELS.",
      429,
    );
  }
  return new AiError(`OpenRouter error ${status}: ${detail}`.slice(0, 300), 502);
}

async function complete(messages: Message[], o: Options<z.ZodType>) {
  const [model, ...fallbacks] = o.config.models;
  const res = await (o.fetchImpl ?? fetch)(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${o.config.apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "SysDesign Arena",
    },
    body: JSON.stringify({
      model,
      // OpenRouter tries these in order if the primary is rate-limited or unavailable.
      ...(fallbacks.length ? { models: o.config.models } : {}),
      messages,
      temperature: 0.2,
      max_tokens: o.maxTokens ?? 4000,
      response_format: { type: "json_object" },
      // Ignored by models that don't reason.
      ...(o.config.reasoningEffort !== "none"
        ? { reasoning: { effort: o.config.reasoningEffort } }
        : {}),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((err: unknown) => {
    const timeout = err instanceof Error && err.name === "TimeoutError";
    throw new AiError(
      timeout ? "The model took too long to answer." : "Couldn't reach OpenRouter.",
      504,
    );
  });

  const body = (await res.json().catch(() => ({}))) as {
    model?: string;
    error?: { message?: string };
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    choices?: { message?: { content?: string | null }; error?: { message?: string } }[];
  };
  if (!res.ok) throw upstreamError(res.status, body.error?.message ?? res.statusText);
  const choice = body.choices?.[0];
  if (choice?.error) throw new AiError(`Model error: ${choice.error.message ?? "unknown"}`, 502);
  return {
    content: choice?.message?.content ?? "",
    model: body.model ?? model,
    usage: {
      inputTokens: body.usage?.prompt_tokens ?? 0,
      outputTokens: body.usage?.completion_tokens ?? 0,
    },
  };
}

/**
 * Asks for JSON and validates it with zod. On a parse/validation failure it retries once,
 * showing the model its own reply and the error (SPEC §7).
 */
export async function chatJson<S extends z.ZodType>(
  o: Options<S>,
): Promise<{ data: z.infer<S>; model: string }> {
  const messages: Message[] = [
    prefixMessage(o.prompt, o.config.models[0]),
    { role: "user", content: o.prompt.user },
  ];

  let lastError = "";
  const used: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  const report = () => o.onUsage?.(used);
  for (let attempt = 0; attempt < 2; attempt++) {
    const { content, model, usage } = await complete(messages, o);
    used.inputTokens += usage.inputTokens;
    used.outputTokens += usage.outputTokens;
    try {
      const parsed = o.schema.safeParse(extractJson(content));
      if (parsed.success) {
        report();
        return { data: parsed.data, model };
      }
      lastError = parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unparseable reply";
    }
    messages.push(
      { role: "assistant", content: content || "(empty reply)" },
      {
        role: "user",
        content: `That reply was invalid (${lastError}). Reply again with ONLY the corrected JSON object.`,
      },
    );
  }
  report();
  throw new AiError(`The model's reply didn't match the expected format: ${lastError}`, 502);
}
