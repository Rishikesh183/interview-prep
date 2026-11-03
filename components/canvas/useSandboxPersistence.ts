"use client";

import type { SandboxContent } from "@/lib/db/dexie";
import { loadSandbox, saveSandbox } from "@/lib/db/sandboxes";
import type { SaveStatus } from "@/lib/persistence/autosaver";
import { usePersistence } from "@/lib/persistence/usePersistence";
import { useAttemptStore } from "@/store/attempt";
import { resetHistory, useWorkspaceStore } from "@/store/workspace";

export type { SaveStatus };

let activeSandbox: string | undefined;
async function load(id: string, signal: AbortSignal) {
  const content = await loadSandbox(id).catch(() => null);
  if (signal.aborted) return;
  activeSandbox = id;
  useAttemptStore.getState().clear();
  const store = useWorkspaceStore.getState();
  store.setDocument(
    content?.graph ?? { nodes: [], edges: [] },
    content?.apis ?? [],
    content?.entities ?? [],
  );
  resetHistory();
}

function snapshot(): SandboxContent {
  const s = useWorkspaceStore.getState();
  return { graph: s.getGraph(), apis: s.apis, entities: s.entities };
}

/**
 * Loads sandbox `id` from IndexedDB, then autosaves (debounced) on every authored change.
 * Switching `id` flushes the previous sandbox before loading the next.
 */
export function useSandboxPersistence(id: string): SaveStatus {
  return usePersistence({
    key: `sandbox:${id}`,
    load: (signal) => load(id, signal),
    snapshot: () => (activeSandbox === id && !useAttemptStore.getState().meta ? snapshot() : null),
    save: (content) => saveSandbox(id, content),
    subscribe: [useWorkspaceStore.subscribe],
  });
}
