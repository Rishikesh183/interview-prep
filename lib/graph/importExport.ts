import {
  CanvasExportSchema,
  GraphSchema,
  type ApiEndpoint,
  type Entity,
  type CanvasExport,
  type Graph,
} from "@/lib/schema";

export function buildExport(
  graph: Graph,
  apis: ApiEndpoint[],
  entities: Entity[] = [],
): CanvasExport {
  return {
    kind: "sysdesign-arena/canvas",
    version: 1,
    exportedAt: Date.now(),
    graph,
    apis,
    entities,
  };
}

export type ImportResult =
  | { ok: true; graph: Graph; apis: ApiEndpoint[]; entities: Entity[] }
  | { ok: false; error: string };

/** Accepts our export envelope or a bare `{ nodes, edges }` graph. */
export function parseImport(text: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }

  const envelope = CanvasExportSchema.safeParse(json);
  if (envelope.success) {
    return {
      ok: true,
      graph: envelope.data.graph,
      apis: envelope.data.apis,
      entities: envelope.data.entities,
    };
  }
  const bare = GraphSchema.safeParse(json);
  if (bare.success) return { ok: true, graph: bare.data, apis: [], entities: [] };

  const issue = envelope.error.issues[0];
  const where = issue?.path.length ? ` at ${issue.path.join(".")}` : "";
  return { ok: false, error: `Not a valid canvas export${where}: ${issue?.message ?? "unknown"}` };
}
