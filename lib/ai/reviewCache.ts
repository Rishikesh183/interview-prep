import { AiReviewSchema, type AiReview } from "@/lib/schema";

/** Review cache keyed by (design hash, model): an unchanged design is never re-reviewed. */
export type ReviewCache = {
  get(designHash: string, model: string): Promise<AiReview | null>;
  put(review: AiReview, model: string): Promise<void>;
};

/** Per-server-process cache (local-only mode, and in front of the Supabase cache). */
export function memoryReviewCache(max = 200): ReviewCache {
  const map = new Map<string, AiReview>();
  const key = (h: string, m: string) => `${h}|${m}`;
  return {
    async get(h, m) {
      return map.get(key(h, m)) ?? null;
    },
    async put(review, model) {
      map.set(key(review.designHash, model), review);
      if (map.size > max) map.delete(map.keys().next().value!);
    },
  };
}

/** Tries each cache in order on read; writes to all. */
export function layeredCache(...caches: ReviewCache[]): ReviewCache {
  return {
    async get(h, m) {
      for (const c of caches) {
        const hit = await c.get(h, m).catch(() => null);
        if (hit) return hit;
      }
      return null;
    },
    async put(review, model) {
      await Promise.all(caches.map((c) => c.put(review, model).catch(() => {})));
    },
  };
}

/** Keeps users apart in a shared (per-process) cache. */
export function scopedCache(cache: ReviewCache, scope: string): ReviewCache {
  return {
    get: (h, m) => cache.get(h, `${scope}|${m}`),
    put: (review, m) => cache.put(review, `${scope}|${m}`),
  };
}

/** Parses a stored review; anything unreadable counts as a miss. */
export function parseCachedReview(value: unknown): AiReview | null {
  const res = AiReviewSchema.safeParse(value);
  return res.success ? res.data : null;
}
