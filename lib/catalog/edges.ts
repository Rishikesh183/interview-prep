import type { EdgeData } from "@/lib/schema";

export const ASYNC_TARGET_TYPES = new Set(["message_queue", "event_stream", "pub_sub"]);

const SQL_TYPES = new Set(["sql_db", "data_warehouse"]);
const TCP_TYPES = new Set([
  "cache",
  "nosql_kv",
  "nosql_document",
  "wide_column",
  "search_index",
  "time_series_db",
  "graph_db",
  "vector_db",
  "coordination",
  "geo_index",
]);

/** Sensible protocol/mode for a freshly drawn edge, based on the endpoint types. */
export function inferEdgeDefaults(sourceType: string, targetType: string): EdgeData {
  if (targetType === "event_stream") return { protocol: "Kafka", mode: "async" };
  if (ASYNC_TARGET_TYPES.has(targetType)) return { protocol: "AMQP", mode: "async" };
  if (sourceType === "event_stream") return { protocol: "Kafka", mode: "async" };
  if (ASYNC_TARGET_TYPES.has(sourceType)) return { protocol: "AMQP", mode: "async" };
  if (targetType === "websocket_server") return { protocol: "WebSocket", mode: "sync" };
  if (SQL_TYPES.has(targetType)) return { protocol: "SQL", mode: "sync" };
  if (TCP_TYPES.has(targetType)) return { protocol: "TCP", mode: "sync" };
  return { protocol: "HTTP", mode: "sync" };
}
