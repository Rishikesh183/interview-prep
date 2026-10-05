import type { ModelReview, ReviewLevel, RubricDimension } from "@/lib/schema";

/** SPEC §7: weights sum to 100. */
export const RUBRIC: {
  dimension: RubricDimension;
  label: string;
  weight: number;
  looksFor: string;
}[] = [
  {
    dimension: "requirements",
    label: "Requirements & scoping",
    weight: 10,
    looksFor: "functional vs non-functional, scope cuts, clarifying questions",
  },
  {
    dimension: "estimation",
    label: "Estimation",
    weight: 10,
    looksFor: "QPS, storage, bandwidth, read:write; numbers used to drive decisions",
  },
  {
    dimension: "data_model",
    label: "Data model & storage choice",
    weight: 15,
    looksFor: "entities, keys, partitioning, SQL vs NoSQL justified by access patterns",
  },
  {
    dimension: "api_design",
    label: "API design",
    weight: 10,
    looksFor: "endpoints, payloads, pagination, idempotency, auth, status codes",
  },
  {
    dimension: "architecture",
    label: "High-level architecture",
    weight: 20,
    looksFor: "right components, clear data flow, read and write paths",
  },
  {
    dimension: "scalability",
    label: "Scalability & bottlenecks",
    weight: 15,
    looksFor: "horizontal scaling, caching, sharding, hot spots, back-pressure",
  },
  {
    dimension: "reliability",
    label: "Reliability & fault tolerance",
    weight: 10,
    looksFor: "replication, failover, retries, idempotency, no single points of failure",
  },
  {
    dimension: "tradeoffs",
    label: "Trade-offs & justification",
    weight: 10,
    looksFor: "notes explaining choices, alternatives considered, consistency trade-offs",
  },
];

/** Weighted 0–100 from 0–10 dimension scores. Missing dimensions count as 0. */
export function overallScore(scores: ModelReview["scores"]): number {
  const byDim = new Map(scores.map((s) => [s.dimension, s.score]));
  const total = RUBRIC.reduce((sum, r) => sum + r.weight * ((byDim.get(r.dimension) ?? 0) / 10), 0);
  return Math.round(total);
}

export function levelFor(overall: number): ReviewLevel {
  if (overall >= 80) return "senior";
  if (overall >= 60) return "mid";
  if (overall >= 40) return "junior";
  return "below_bar";
}

export const LEVEL_LABEL: Record<ReviewLevel, string> = {
  below_bar: "Below the bar",
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
};
