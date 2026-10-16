"use client";

import type { SandboxContent } from "@/lib/db/dexie";
import { loadSandbox, saveSandbox } from "@/lib/db/sandboxes";
import type { SaveStatus } from "@/lib/persistence/autosaver";
import { usePersistence } from "@/lib/persistence/usePersistence";
import { useAttemptStore } from "@/store/attempt";
import { resetHistory, useWorkspaceStore } from "@/store/workspace";

export type { SaveStatus };

async function load(id: string) {
  useAttemptStore.getState().clear();
  const content = await loadSandbox(id).catch(() => null);
  const store = useWorkspaceStore.getState();
  store.setGraph(content?.graph ?? { nodes: [], edges: [] });
  store.setApis(content?.apis ?? []);
  resetHistory();
}

function snapshot(): SandboxContent {
  const s = useWorkspaceStore.getState();
  return { graph: s.getGraph(), apis: s.apis };
}

/**
 * Loads sandbox `id` from IndexedDB, then autosaves (debounced) on every authored change.
 * Switching `id` flushes the previous sandbox before loading the next.
 */
export function useSandboxPersistence(id: string): SaveStatus {
  return usePersistence({
    key: `sandbox:${id}`,
    load: () => load(id),
    snapshot,
    save: (content) => saveSandbox(id, content),
    subscribe: [useWorkspaceStore.subscribe],
  });
}
