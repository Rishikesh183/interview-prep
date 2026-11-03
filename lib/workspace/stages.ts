import { GROUPS } from "@/lib/catalog/groups";
import type { Attempt, Stage, Track } from "@/lib/schema";

export const STAGES: { id: Stage; label: string; hint: string }[] = [
  {
    id: "requirements",
    label: "Requirements",
    hint: "Clarify scope: functional, non-functional, out of scope",
  },
  { id: "estimation", label: "Estimation", hint: "Back-of-envelope QPS, storage, bandwidth" },
  { id: "data_model", label: "Data Model", hint: "Entities, keys and where they live" },
  { id: "apis", label: "APIs", hint: "Endpoints owned by services or gateways" },
  { id: "design", label: "Design", hint: "Build the architecture on the canvas" },
  { id: "review", label: "Review", hint: "Run tests, submit, compare with references" },
];

export const FRONTEND_API_OWNER_TYPES = [
  "ui_component",
  "api_client",
  "realtime_client",
  "web_worker",
  "service_worker",
  "external_service",
];
export function stagesFor(track: Track = "backend") {
  if (track === "backend") return STAGES;
  const labels = [
    "Requirements & UX",
    "Performance",
    "State Model",
    "Contracts",
    "Architecture",
    "Review",
  ];
  const hints = [
    "User journeys, interaction states and scope",
    "Browser budgets, devices and measurement plan",
    "Local, URL, server and persistent state ownership",
    "Props, events, network payloads and recovery",
    "Components, browser data flow and boundaries",
    "Check design coverage and compare reference solutions",
  ];
  return STAGES.map((s, i) => ({ ...s, label: labels[i], hint: hints[i] }));
}

/** Node types that can own API endpoints or browser contracts. */
export const STATE_OWNER_TYPES = [
  ...GROUPS["@storage"],
  ...GROUPS["@frontend-state"],
  "cache",
  "coordination",
  "event_stream",
  "message_queue",
  "id_generator",
  "geo_index",
];

export const API_OWNER_TYPES = [
  "microservice",
  "edge_gateway",
  ...FRONTEND_API_OWNER_TYPES,
  "service",
  "api_gateway",
  "websocket_server",
  "worker",
  "serverless_fn",
  "scheduler",
  "rate_limiter",
  "id_generator",
  "cache",
  "nosql_kv",
  "coordination",
  "event_stream",
  "message_queue",
];

export type Progress = Pick<Attempt, "requirements" | "estimation" | "entities" | "status"> & {
  apiCount: number;
  nodeCount: number;
  edgeCount: number;
};

export function progressOf(a: Attempt): Progress {
  return {
    ...a,
    apiCount: a.apis.length,
    nodeCount: a.graph.nodes.length,
    edgeCount: a.graph.edges.length,
  };
}

/** Whether a stage has meaningful content (drives the check marks in the stepper). */
export function stageDone(stage: Stage, a: Progress, track: Track = "backend"): boolean {
  switch (stage) {
    case "requirements":
      return a.requirements.functional.length > 0 && a.requirements.nonFunctional.length > 0;
    case "estimation":
      return track === "frontend"
        ? Boolean(a.estimation.notes?.trim())
        : a.estimation.dau > 0 && a.estimation.objectSize > 0;
    case "data_model":
      return a.entities.some((e) => e.name.trim() !== "");
    case "apis":
      return a.apiCount > 0;
    case "design":
      return a.nodeCount >= 3 && a.edgeCount >= 2;
    case "review":
      return a.status !== "in_progress";
  }
}
