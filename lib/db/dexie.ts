import Dexie, { type EntityTable } from "dexie";
import { z } from "zod";
import { ApiEndpointSchema, GraphSchema, type Attempt } from "@/lib/schema";

const SandboxContentSchema = z.object({
  graph: GraphSchema,
  apis: z.array(ApiEndpointSchema).default([]),
});
export type SandboxContent = z.infer<typeof SandboxContentSchema>;

/** A free-practice canvas not tied to a problem. `id` is "default" for now. */
type SandboxRow = SandboxContent & { id: string; updatedAt: number };

class ArenaDB extends Dexie {
  sandbox!: EntityTable<SandboxRow, "id">;
  attempts!: EntityTable<Attempt, "id">;

  constructor() {
    super("sysdesign-arena");
    this.version(1).stores({ sandbox: "id, updatedAt" });
    this.version(2).stores({
      sandbox: "id, updatedAt",
      attempts: "id, problemId, startedAt, updatedAt, status",
    });
  }
}

let instance: ArenaDB | null = null;

/** Lazily created so server-side imports never touch IndexedDB. */
export function db(): ArenaDB {
  instance ??= new ArenaDB();
  return instance;
}

export async function loadSandbox(id = "default"): Promise<SandboxContent | null> {
  const row = await db().sandbox.get(id);
  if (!row) return null;
  const parsed = SandboxContentSchema.safeParse(row);
  return parsed.success ? parsed.data : null;
}

export async function saveSandbox(content: SandboxContent, id = "default"): Promise<void> {
  await db().sandbox.put({ id, ...content, updatedAt: Date.now() });
}
