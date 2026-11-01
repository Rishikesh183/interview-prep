import { findFreePosition, SLOT } from "@/lib/graph/placement";
import { useWorkspaceStore } from "@/store/workspace";

/** Add a real canvas component while authoring entities or APIs. */
export function addStageNode(type: string, label?: string) {
  const ws = useWorkspaceStore.getState();
  const occupied = ws.nodes.map((n) => ({
    ...n.position,
    width: n.measured?.width ?? n.width ?? SLOT.width,
    height: n.measured?.height ?? n.height ?? SLOT.height,
  }));
  const id = ws.addNode(type, findFreePosition({ x: 0, y: 0 }, occupied));
  if (id && label?.trim()) ws.updateNodeData(id, { label: label.trim() });
  return id;
}
