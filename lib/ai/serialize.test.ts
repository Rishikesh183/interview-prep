import { describe, expect, it } from "vitest";
import { weakUrlShortener } from "@/test/fixtures";
import { extractJson } from "./json";
import { levelFor, overallScore, RUBRIC } from "./rubric";
import { designHash, hashText, serializeAttempt, serializeGraph } from "./serialize";

describe("serializeGraph", () => {
  const text = serializeGraph(weakUrlShortener());

  it("lists nodes with type, label, instance count and config", () => {
    expect(text).toContain('n3 service "URL Service" x3-10 {stateless, autoscale}');
    expect(text).toContain(
      'n2 load_balancer "LB" {layer: L7, algorithm: round-robin, healthChecks}',
    );
    expect(text).toContain(
      'n4 sql_db "Postgres" {engine: PostgreSQL, replicas: 1, sharding: none}',
    );
  });

  it("shows a switched-off default as !flag", () => {
    const a = weakUrlShortener();
    a.graph.nodes[2].data.config.stateless = false;
    expect(serializeGraph(a)).toContain("{!stateless, autoscale}");
  });

  it("lists edges caller -> callee with protocol, mode, op and label", () => {
    expect(text).toContain('n3->n4 SQL sync read_write "insert / lookup"');
  });

  it("lists APIs with owner and flags, and notes", () => {
    expect(text).toContain("n3 POST /v1/urls [auth]");
    expect(text).toContain("n3 GET /{code}");
    expect(text).toContain('n3: "Base62 of an auto-increment id"');
  });
});

describe("serializeAttempt", () => {
  const text = serializeAttempt(weakUrlShortener());
  it("includes requirements, estimation results and entities", () => {
    expect(text).toContain("  - Highly available");
    expect(text).toMatch(/read QPS 3\.82K avg \/ 11\.5K peak/);
    expect(text).toContain("Url: code PK, long_url");
  });
  it("says when estimation wasn't done", () => {
    const a = weakUrlShortener();
    a.estimation.dau = 0;
    expect(serializeAttempt(a)).toContain("ESTIMATION: (not done)");
  });
});

describe("designHash", () => {
  it("is stable and changes with the design", () => {
    const a = weakUrlShortener();
    expect(designHash(a)).toBe(designHash(weakUrlShortener()));
    a.graph.nodes[3].data.config.replicas = 3;
    expect(designHash(a)).not.toBe(designHash(weakUrlShortener()));
    expect(hashText("")).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("extractJson", () => {
  it.each([
    ['{"a":1}', { a: 1 }],
    ['```json\n{"a":1}\n```', { a: 1 }],
    ['<think>hmm {"no":1}</think>\nSure! Here it is: {"a":1} hope that helps', { a: 1 }],
  ])("parses %j", (input, expected) => {
    expect(extractJson(input)).toEqual(expected);
  });
  it("throws when there's no object", () => {
    expect(() => extractJson("I can't do that")).toThrow();
  });
});

describe("rubric", () => {
  it("weights sum to 100", () => {
    expect(RUBRIC.reduce((s, r) => s + r.weight, 0)).toBe(100);
  });
  it("computes a weighted overall and level", () => {
    const all = (score: number) =>
      RUBRIC.map((r) => ({ dimension: r.dimension, score, comment: "" }));
    expect(overallScore(all(10))).toBe(100);
    expect(overallScore(all(5))).toBe(50);
    expect(overallScore([{ dimension: "architecture", score: 10, comment: "" }])).toBe(20);
    expect([levelFor(85), levelFor(65), levelFor(45), levelFor(10)]).toEqual([
      "senior",
      "mid",
      "junior",
      "below_bar",
    ]);
  });
});
