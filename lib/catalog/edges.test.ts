import { describe, expect, it } from "vitest";
import { inferEdgeDefaults } from "./edges";

describe("inferEdgeDefaults", () => {
  it.each([
    ["service", "event_stream", { protocol: "Kafka", mode: "async" }],
    ["service", "message_queue", { protocol: "AMQP", mode: "async" }],
    ["event_stream", "worker", { protocol: "Kafka", mode: "async" }],
    ["pub_sub", "websocket_server", { protocol: "AMQP", mode: "async" }],
    ["web_client", "websocket_server", { protocol: "WebSocket", mode: "sync" }],
    ["service", "sql_db", { protocol: "SQL", mode: "sync" }],
    ["service", "cache", { protocol: "TCP", mode: "sync" }],
    ["web_client", "load_balancer", { protocol: "HTTP", mode: "sync" }],
  ])("%s -> %s", (source, target, expected) => {
    expect(inferEdgeDefaults(source, target)).toEqual(expected);
  });
});
