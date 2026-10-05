import { z } from "zod";
import { ApiEndpointSchema } from "./api";
import { GraphSchema } from "./graph";

export const CanvasExportSchema = z.object({
  kind: z.literal("sysdesign-arena/canvas"),
  version: z.literal(1),
  exportedAt: z.number(),
  graph: GraphSchema,
  apis: z.array(ApiEndpointSchema).default([]),
});
export type CanvasExport = z.infer<typeof CanvasExportSchema>;
