import type { TypeList } from "@/lib/schema";

const DB = [
  "sql_db",
  "nosql_kv",
  "nosql_document",
  "wide_column",
  "graph_db",
  "time_series_db",
  "vector_db",
];

/** Shorthands usable anywhere a test names a node type. */
export const TYPE_ALIASES: Record<string, readonly string[]> = {
  client: ["web_client", "mobile_client"],
  db: DB,
  nosql: ["nosql_kv", "nosql_document", "wide_column"],
  storage: [...DB, "object_storage", "search_index", "data_warehouse"],
  queue: ["message_queue", "event_stream", "pub_sub"],
  compute: [
    "service",
    "worker",
    "serverless_fn",
    "websocket_server",
    "stream_processor",
    "batch_processor",
  ],
  entry: ["load_balancer", "api_gateway"],
};

export const ANY_TYPE = "*";

/** Expands a type list into concrete node types; `null` means "any type". */
export function expandTypes(list: TypeList): Set<string> | null {
  const items = Array.isArray(list) ? list : [list];
  if (items.includes(ANY_TYPE)) return null;
  return new Set(items.flatMap((t) => TYPE_ALIASES[t] ?? [t]));
}

/** Every type name a test may reference that is not a catalog type. */
export function aliasNames(): string[] {
  return [...Object.keys(TYPE_ALIASES), ANY_TYPE];
}
