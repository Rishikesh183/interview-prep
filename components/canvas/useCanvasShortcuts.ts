"use client";

import { useShortcuts } from "@/components/useShortcuts";
import { useWorkspaceStore, undoWorkspace, redoWorkspace } from "@/store/workspace";

/** Undo/redo/duplicate on the canvas. Delete is handled by React Flow; inputs keep native undo. */
export function useCanvasShortcuts(enabled = true) {
  useShortcuts(
    {
      undo: undoWorkspace,
      redo: redoWorkspace,
      "redo-y": redoWorkspace,
      duplicate: () => useWorkspaceStore.getState().duplicateSelected(),
    },
    enabled,
  );
}
