import { z } from "zod";

export const PositionSchema = z.object({ x: z.number(), y: z.number() });

export const NodeDataSchema = z.object({
  label: z.string(),
  config: z.record(z.string(), z.unknown()),
  note: z.string().optional(),
});
export type NodeData = z.infer<typeof NodeDataSchema>;

export const GraphNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  position: PositionSchema,
  data: NodeDataSchema,
  /** Only set for resizable annotation nodes (note, group). */
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const ProtocolSchema = z.enum([
  "HTTP",
  "gRPC",
  "WebSocket",
  "TCP",
  "AMQP",
  "Kafka",
  "SQL",
  "internal",
]);
export type Protocol = z.infer<typeof ProtocolSchema>;

export const EdgeModeSchema = z.enum(["sync", "async"]);
export type EdgeMode = z.infer<typeof EdgeModeSchema>;

export const EdgeOpSchema = z.enum(["read", "write", "read_write"]);
export type EdgeOp = z.infer<typeof EdgeOpSchema>;

export const EdgeDataSchema = z.object({
  protocol: ProtocolSchema,
  mode: EdgeModeSchema,
  op: EdgeOpSchema.optional(),
  apiId: z.string().optional(),
  label: z.string().optional(),
  note: z.string().optional(),
});
export type EdgeData = z.infer<typeof EdgeDataSchema>;

export const GraphEdgeSchema = EdgeDataSchema.extend({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullish(),
  targetHandle: z.string().nullish(),
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const GraphSchema = z.object({
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});
export type Graph = z.infer<typeof GraphSchema>;

export const EMPTY_GRAPH: Graph = { nodes: [], edges: [] };
