"use client";

import { useShortcuts } from "@/components/useShortcuts";
import { useWorkspaceStore } from "@/store/workspace";

/** Undo/redo/duplicate on the canvas. Delete is handled by React Flow; inputs keep native undo. */
export function useCanvasShortcuts(enabled = true) {
  useShortcuts(
    {
      undo: () => useWorkspaceStore.temporal.getState().undo(),
      redo: () => useWorkspaceStore.temporal.getState().redo(),
      "redo-y": () => useWorkspaceStore.temporal.getState().redo(),
      duplicate: () => useWorkspaceStore.getState().duplicateSelected(),
    },
    enabled,
  );
}
