import type { NodeTypes } from "@xyflow/react";
import { COMPONENT_TYPES } from "@/lib/catalog/components";
import { ComponentNode } from "./ComponentNode";
import { GroupNode } from "./GroupNode";
import { NoteNode } from "./NoteNode";

/** Custom renderers by type; everything else in the catalog uses the generic ComponentNode. */
const CUSTOM: NodeTypes = { note: NoteNode, group: GroupNode };

export const nodeTypes: NodeTypes = Object.fromEntries(
  COMPONENT_TYPES.map((type) => [type, CUSTOM[type] ?? ComponentNode]),
);
