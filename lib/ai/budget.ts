import { istDay } from "@/lib/progress/stats";
import { DEFAULT_DAILY_CALLS } from "./limits";
import { AiError, type TokenUsage } from "./openrouter";

export { DEFAULT_DAILY_CALLS, MAX_FOLLOW_UPS } from "./limits";

export function dailyLimit(env: Record<string, string | undefined> = process.env): number {
  const n = Number.parseInt(env.DAILY_AI_CALLS ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_DAILY_CALLS;
}

/** The budget resets at midnight India time. */
export function budgetDay(now = new Date()): string {
  return istDay(now.getTime());
}

/** ai_usage, as the server sees it. Implemented over Supabase RPCs in ./usageStore.ts. */
export type UsageStore = {
  /** Takes one call; the new count, or null when the limit was already reached. Atomic. */
  reserve(userId: string, day: string, limit: number): Promise<number | null>;
  /** Gives a reserved call back (the model call failed). */
  release(userId: string, day: string): Promise<void>;
  recordTokens(userId: string, day: string, usage: TokenUsage): Promise<void>;
  used(userId: string, day: string): Promise<number>;
};

export class BudgetExceededError extends AiError {
  constructor(limit: number) {
    super(
      `You've used all ${limit} AI calls for today. The budget resets at midnight (IST). ` +
        "Cached reviews of unchanged designs still work.",
      429,
    );
  }
}

export type Budget = { store: UsageStore; userId: string; limit: number; now?: () => Date };

/**
 * Runs one paid model call inside the daily budget: reserve first (so parallel requests can't
 * overspend), give the call back if it fails, and log tokens if it succeeds. `null` = no budget.
 */
export async function withBudget<T>(
  budget: Budget | null,
  call: (onUsage: (u: TokenUsage) => void) => Promise<T>,
): Promise<T> {
  if (!budget) return call(() => {});
  const { store, userId, limit } = budget;
  const day = budgetDay(budget.now?.() ?? new Date());
  if ((await store.reserve(userId, day, limit)) === null) throw new BudgetExceededError(limit);

  let usage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
  try {
    const result = await call((u) => (usage = u));
    await store.recordTokens(userId, day, usage).catch(() => {});
    return result;
  } catch (err) {
    await store.release(userId, day).catch(() => {});
    throw err;
  }
}

/** In-memory store with the same rules as the SQL functions (tests). */
export function memoryUsageStore() {
  const rows = new Map<string, { calls: number; inputTokens: number; outputTokens: number }>();
  const key = (u: string, d: string) => `${u}|${d}`;
  const store: UsageStore = {
    async reserve(u, d, limit) {
      const row = rows.get(key(u, d)) ?? { calls: 0, inputTokens: 0, outputTokens: 0 };
      if (limit <= 0 || row.calls >= limit) return null;
      row.calls += 1;
      rows.set(key(u, d), row);
      return row.calls;
    },
    async release(u, d) {
      const row = rows.get(key(u, d));
      if (row) row.calls = Math.max(0, row.calls - 1);
    },
    async recordTokens(u, d, usage) {
      const row = rows.get(key(u, d));
      if (!row) return;
      row.inputTokens += usage.inputTokens;
      row.outputTokens += usage.outputTokens;
    },
    async used(u, d) {
      return rows.get(key(u, d))?.calls ?? 0;
    },
  };
  return { store, rows };
}
