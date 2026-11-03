/**
 * Catalog groups usable wherever a test names a node type (PHASE-2 §2): "@database" matches any
 * database, etc. "*" matches every non-annotation node.
 */
const DATABASE = ["sql_db", "nosql_kv", "nosql_document", "wide_column"];

export const GROUPS: Record<string, readonly string[]> = {
  "@frontend": [
    "ui_component",
    "client_store",
    "query_cache",
    "api_client",
    "browser_storage",
    "web_worker",
    "service_worker",
    "realtime_client",
    "router",
  ],
  "@frontend-state": ["ui_component", "client_store", "query_cache", "browser_storage", "router"],
  "@client": ["web_client", "mobile_client"],
  "@database": DATABASE,
  "@queue": ["message_queue", "event_stream", "pub_sub"],
  /** Anything that persists data. */
  "@storage": [
    ...DATABASE,
    "graph_db",
    "time_series_db",
    "vector_db",
    "object_storage",
    "search_index",
    "data_warehouse",
  ],
  "@compute": [
    "service",
    "microservice",
    "worker",
    "serverless_fn",
    "websocket_server",
    "stream_processor",
    "batch_processor",
  ],
  /** Where client traffic enters the system. */
  "@entry": ["load_balancer", "api_gateway", "edge_gateway"],
};

export const ANY_TYPE = "*";

const FAMILIES: Record<string, string[]> = {
  service: ["service", "microservice"],
  api_gateway: ["api_gateway", "edge_gateway"],
  load_balancer: ["load_balancer", "edge_gateway"],
};

export type TypeRefs = string | readonly string[];

/** Expands types/groups into concrete node types; `null` means "any type". */
export function expandTypes(refs: TypeRefs): Set<string> | null {
  const items = typeof refs === "string" ? [refs] : refs;
  if (items.includes(ANY_TYPE)) return null;
  return new Set(items.flatMap((t) => GROUPS[t] ?? FAMILIES[t] ?? [t]));
}

export function isGroupOrWildcard(ref: string): boolean {
  return ref === ANY_TYPE || ref in GROUPS;
}
