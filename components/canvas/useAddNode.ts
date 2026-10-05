"use client";

import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { findFreePosition, SLOT } from "@/lib/graph/placement";
import { useWorkspaceStore } from "@/store/workspace";

export function useAddNode() {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useWorkspaceStore((s) => s.addNode);

  /** Drop: centre the new node on the cursor. */
  const addAtScreen = useCallback(
    (type: string, clientX: number, clientY: number) => {
      const p = screenToFlowPosition({ x: clientX, y: clientY });
      return addNode(type, { x: p.x - SLOT.width / 2, y: p.y - SLOT.height / 2 });
    },
    [addNode, screenToFlowPosition],
  );

  /** Click-to-add: nearest free slot to the centre of the visible canvas. */
  const addAtCenter = useCallback(
    (type: string) => {
      const pane = document.querySelector(".react-flow")?.getBoundingClientRect();
      if (!pane) return null;
      const centre = screenToFlowPosition({
        x: pane.left + pane.width / 2,
        y: pane.top + pane.height / 2,
      });
      const occupied = useWorkspaceStore
        .getState()
        .nodes.filter((n) => n.type !== "group")
        .map((n) => ({
          ...n.position,
          width: n.measured?.width ?? n.width ?? SLOT.width,
          height: n.measured?.height ?? n.height ?? SLOT.height,
        }));
      const desired = { x: centre.x - SLOT.width / 2, y: centre.y - SLOT.height / 2 };
      return addNode(type, findFreePosition(desired, occupied));
    },
    [addNode, screenToFlowPosition],
  );

  return { addAtScreen, addAtCenter };
}
