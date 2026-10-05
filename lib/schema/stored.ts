import { z } from "zod";
import { ProtocolSchema } from "./graph";

/**
 * Compact graph format persisted to Supabase (PHASE-2 §1). Keys are short on purpose;
 * defaults are omitted and restored from the catalog when decoding.
 */
export const StoredNodeSchema = z.object({
  /** id */ i: z.string(),
  /** type */ t: z.string(),
  x: z.number(),
  y: z.number(),
  /** label, only if it differs from the catalog default */ l: z.string().optional(),
  /** config keys that differ from the catalog default */ c: z
    .record(z.string(), z.unknown())
    .optional(),
  /** note */ no: z.string().optional(),
  /** width/height: only for resizable annotation nodes (note, group) */
  w: z.number().optional(),
  h: z.number().optional(),
});

export const StoredEdgeSchema = z.object({
  i: z.string(),
  /** source */ s: z.string(),
  /** destination */ d: z.string(),
  /** protocol, only if it differs from the default inferred from the endpoint types */
  p: ProtocolSchema.optional(),
  /** "a" = async; sync is omitted */ m: z.literal("a").optional(),
  o: z.enum(["r", "w", "rw"]).optional(),
  /** linked API id */ a: z.string().optional(),
  l: z.string().optional(),
  no: z.string().optional(),
  /** handle sides "source>target", e.g. "r>l" */ h: z.string().optional(),
});

export const StoredGraphSchema = z.object({
  v: z.literal(1),
  n: z.array(StoredNodeSchema),
  e: z.array(StoredEdgeSchema),
});
export type StoredGraph = z.infer<typeof StoredGraphSchema>;
export type StoredNode = z.infer<typeof StoredNodeSchema>;
export type StoredEdge = z.infer<typeof StoredEdgeSchema>;
