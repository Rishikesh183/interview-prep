import type { Attempt, Stage } from "@/lib/schema";

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

/** Node types that can own API endpoints. */
export const API_OWNER_TYPES = ["service", "api_gateway", "websocket_server"];

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
export function stageDone(stage: Stage, a: Progress): boolean {
  switch (stage) {
    case "requirements":
      return a.requirements.functional.length > 0 && a.requirements.nonFunctional.length > 0;
    case "estimation":
      return a.estimation.dau > 0 && a.estimation.objectSize > 0;
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
