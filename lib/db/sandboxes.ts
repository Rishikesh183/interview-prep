import { db, SandboxContentSchema, type SandboxContent, type SandboxRow } from "./dexie";

/** Open canvases are kept small so the sandbox stays snappy. */
export const MAX_SANDBOXES = 5;

/** Id of the first sandbox (and of the one saved before sandboxes had names). */
export const DEFAULT_SANDBOX_ID = "default";

export type SandboxSummary = { id: string; name: string; createdAt: number; updatedAt: number };

const cleanName = (name: string) => name.trim().slice(0, 40) || "Untitled";

const summarize = (row: SandboxRow): SandboxSummary => ({
  id: row.id,
  name: row.name ?? "Sandbox 1",
  createdAt: row.createdAt ?? 0,
  updatedAt: row.updatedAt,
});

/** All sandboxes in tab order (oldest first). */
export async function listSandboxes(): Promise<SandboxSummary[]> {
  const rows = await db().sandbox.toArray();
  return rows.map(summarize).sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

/** Makes sure at least one sandbox exists. Idempotent, so concurrent callers can't double-create. */
export async function ensureSandbox(now = Date.now()): Promise<void> {
  const d = db();
  await d.transaction("rw", d.sandbox, async () => {
    if ((await d.sandbox.count()) > 0) return;
    await d.sandbox.put({
      id: DEFAULT_SANDBOX_ID,
      name: "Sandbox 1",
      graph: { nodes: [], edges: [] },
      apis: [],
      createdAt: now,
      updatedAt: now,
    });
  });
}

/** Creates an empty sandbox. Throws once `MAX_SANDBOXES` exist. */
export async function createSandbox(name?: string, now = Date.now()): Promise<SandboxSummary> {
  const d = db();
  return d.transaction("rw", d.sandbox, async () => {
    const existing = await d.sandbox.toArray();
    if (existing.length >= MAX_SANDBOXES) {
      throw new Error(`You can have at most ${MAX_SANDBOXES} sandboxes`);
    }
    const taken = new Set(existing.map((r) => summarize(r).name));
    let n = existing.length + 1;
    while (taken.has(`Sandbox ${n}`)) n++;
    const row: SandboxRow = {
      id: crypto.randomUUID(),
      name: name === undefined ? `Sandbox ${n}` : cleanName(name),
      graph: { nodes: [], edges: [] },
      apis: [],
      // Strictly increasing, so tab order is stable even within one millisecond.
      createdAt: Math.max(now, ...existing.map((r) => (r.createdAt ?? 0) + 1)),
      updatedAt: now,
    };
    await d.sandbox.put(row);
    return summarize(row);
  });
}

export async function loadSandbox(id: string): Promise<SandboxContent | null> {
  const row = await db().sandbox.get(id);
  if (!row) return null;
  const parsed = SandboxContentSchema.safeParse(row);
  return parsed.success ? parsed.data : null;
}

/**
 * Updates an existing sandbox's canvas. A no-op if it was deleted, so a late autosave of a
 * just-closed tab can't bring it back.
 */
export async function saveSandbox(id: string, content: SandboxContent): Promise<void> {
  await db().sandbox.update(id, { ...content, updatedAt: Date.now() });
}

export async function renameSandbox(id: string, name: string): Promise<void> {
  await db().sandbox.update(id, { name: cleanName(name) });
}

export async function deleteSandbox(id: string): Promise<void> {
  await db().sandbox.delete(id);
}
