import { describe, expect, it } from "vitest";
import { CATALOG, CATEGORIES, COMPONENT_TYPES, configBadges, parseConfig } from "./components";

const SPEC_TYPES = [
  "web_client", "mobile_client", "external_service",
  "dns", "cdn", "api_gateway", "load_balancer", "rate_limiter", "waf",
  "service", "websocket_server", "worker", "serverless_fn", "scheduler", "stream_processor", "batch_processor",
  "sql_db", "nosql_kv", "nosql_document", "wide_column", "cache", "object_storage", "search_index",
  "time_series_db", "graph_db", "vector_db", "data_warehouse",
  "message_queue", "event_stream", "pub_sub",
  "auth_service", "id_generator", "coordination", "service_discovery", "monitoring",
  "notification_service", "geo_index",
  "note", "group",
]; // prettier-ignore

describe("component catalog", () => {
  it("covers every component type in the spec", () => {
    expect([...COMPONENT_TYPES].sort()).toEqual([...SPEC_TYPES].sort());
  });

  it("puts every component in a known category", () => {
    const ids = new Set(CATEGORIES.map((c) => c.id));
    for (const def of Object.values(CATALOG)) expect(ids.has(def.category)).toBe(true);
  });

  it("has default configs that satisfy their own schema", () => {
    for (const def of Object.values(CATALOG)) {
      expect(def.configSchema.safeParse(def.defaultConfig).success, def.type).toBe(true);
    }
  });

  it("exposes capacity numbers from capacity.ts", () => {
    expect(CATALOG.service.capacity.rps).toBe(1_000);
    expect(CATALOG.sql_db.capacity).toEqual({ writesPerSec: 5_000, readsPerSec: 20_000 });
  });
});

describe("parseConfig", () => {
  it("fills missing keys with defaults", () => {
    const cfg = parseConfig("load_balancer", {});
    expect(cfg).toMatchObject({ layer: "L7", algorithm: "round-robin", healthChecks: true });
  });

  it("replaces invalid values with defaults but keeps valid ones", () => {
    const cfg = parseConfig("load_balancer", { layer: "L9", algorithm: "least-conn" });
    expect(cfg.layer).toBe("L7");
    expect(cfg.algorithm).toBe("least-conn");
  });

  it("leaves optional selects unset (cache strategy starts undecided)", () => {
    expect(parseConfig("cache", {}).strategy).toBeUndefined();
    expect(parseConfig("cache", { strategy: "nope" }).strategy).toBeUndefined();
  });

  it("returns an empty config for unknown types", () => {
    expect(parseConfig("teleporter", { a: 1 })).toEqual({});
  });
});

describe("configBadges", () => {
  it("shows key config values", () => {
    const cfg = parseConfig("sql_db", { replicas: 3, sharding: "hash", shardKey: "user_id" });
    expect(configBadges("sql_db", cfg)).toEqual([
      "PostgreSQL",
      "3 replicas",
      "hash-sharded",
      "key: user_id",
    ]);
  });

  it("shows an instance range for services", () => {
    const cfg = parseConfig("service", { instancesMin: 3, instancesMax: 3 });
    expect(configBadges("service", cfg)).toContain("x3");
    expect(configBadges("service", parseConfig("service", {}))).toContain("x2-10");
  });

  it("hides false booleans and empty text", () => {
    const badges = configBadges("cache", parseConfig("cache", {}));
    expect(badges).toEqual(["Redis"]);
  });
});
