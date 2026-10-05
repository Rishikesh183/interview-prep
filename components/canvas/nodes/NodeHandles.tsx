import { Handle, Position } from "@xyflow/react";

const SIDES = [
  { id: "t", position: Position.Top },
  { id: "r", position: Position.Right },
  { id: "b", position: Position.Bottom },
  { id: "l", position: Position.Left },
] as const;

/** One handle per side. The canvas uses loose connection mode, so any handle can start or end an edge. */
export function NodeHandles() {
  return (
    <>
      {SIDES.map((s) => (
        <Handle
          key={s.id}
          id={s.id}
          type="source"
          position={s.position}
          className="bg-primary! border-background! size-2.5! opacity-0 transition-opacity group-hover:opacity-100"
        />
      ))}
    </>
  );
}
