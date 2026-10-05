import type { Capacity } from "@/lib/schema";

/**
 * Rough per-instance capacity. Deliberately approximate: good enough to spot
 * order-of-magnitude bottlenecks, not to size a fleet. Edit freely.
 */
export const CAPACITY: Record<string, Capacity> = {
  service: { rps: 1_000 },
  websocket_server: { connections: 50_000 },
  worker: { opsPerSec: 500 },
  serverless_fn: { rps: 1_000 },
  api_gateway: { rps: 20_000 },
  load_balancer: { rps: 50_000 },
  rate_limiter: { rps: 50_000 },
  cdn: { rps: 1_000_000 },
  cache: { opsPerSec: 100_000 },
  sql_db: { writesPerSec: 5_000, readsPerSec: 20_000 },
  nosql_kv: { writesPerSec: 10_000, readsPerSec: 30_000 },
  nosql_document: { writesPerSec: 5_000, readsPerSec: 20_000 },
  wide_column: { writesPerSec: 10_000, readsPerSec: 10_000 },
  search_index: { writesPerSec: 2_000, readsPerSec: 5_000 },
  time_series_db: { writesPerSec: 50_000, readsPerSec: 5_000 },
  graph_db: { writesPerSec: 2_000, readsPerSec: 10_000 },
  vector_db: { writesPerSec: 1_000, readsPerSec: 2_000 },
  object_storage: { writesPerSec: 3_500, readsPerSec: 5_500 },
  message_queue: { opsPerSec: 3_000 },
  event_stream: { mbPerSec: 10 },
  pub_sub: { opsPerSec: 100_000 },
};

export function capacityOf(type: string): Capacity {
  return CAPACITY[type] ?? {};
}
