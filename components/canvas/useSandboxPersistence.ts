"use client";

import { loadSandbox, saveSandbox, type SandboxContent } from "@/lib/db/dexie";
import type { SaveStatus } from "@/lib/persistence/autosaver";
import { usePersistence } from "@/lib/persistence/usePersistence";
import { useAttemptStore } from "@/store/attempt";
import { resetHistory, useWorkspaceStore } from "@/store/workspace";

export type { SaveStatus };

async function load() {
  useAttemptStore.getState().clear();
  const content = await loadSandbox().catch(() => null);
  const store = useWorkspaceStore.getState();
  store.setGraph(content?.graph ?? { nodes: [], edges: [] });
  store.setApis(content?.apis ?? []);
  resetHistory();
}

function snapshot(): SandboxContent {
  const s = useWorkspaceStore.getState();
  return { graph: s.getGraph(), apis: s.apis };
}

/** Loads the sandbox from IndexedDB once, then autosaves (debounced) on every authored change. */
export function useSandboxPersistence(): SaveStatus {
  return usePersistence({
    key: "sandbox",
    load,
    snapshot,
    save: (content) => saveSandbox(content),
    subscribe: [useWorkspaceStore.subscribe],
  });
}
