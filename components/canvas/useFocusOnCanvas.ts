"use client";

import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { useWorkspaceStore, type Highlight } from "@/store/workspace";

/**
 * Highlights nodes/edges (lint issues, test evidence, AI review issues), selects the nodes so
 * the inspector opens, and zooms to them. Needs a mounted canvas; use `highlightLater`
 * when switching to the Design stage first (the canvas zooms to the highlight on mount).
 */
export function useFocusOnCanvas({ reserveRightPx = 0 }: { reserveRightPx?: number } = {}) {
  const { fitView } = useReactFlow();
  return useCallback(
    (h: Highlight) => {
      const ws = useWorkspaceStore.getState();
      ws.setHighlight(h);
      if (!h.nodeIds.length) return;
      ws.selectNodes(h.nodeIds);
      void fitView({
        nodes: h.nodeIds.map((id) => ({ id })),
        // Keep the nodes clear of a panel covering the right of the canvas (e.g. Tests).
        padding: reserveRightPx
          ? { top: "15%", bottom: "15%", left: "8%", right: `${reserveRightPx}px` }
          : 0.6,
        maxZoom: 1.2,
        duration: 300,
      });
    },
    [fitView, reserveRightPx],
  );
}

export function highlightLater(h: Highlight) {
  const ws = useWorkspaceStore.getState();
  ws.setHighlight(h);
  if (h.nodeIds.length) ws.selectNodes(h.nodeIds);
}

export const sameHighlight = (a: Highlight, b: Highlight) =>
  a.nodeIds.join() === b.nodeIds.join() && a.edgeIds.join() === b.edgeIds.join();
