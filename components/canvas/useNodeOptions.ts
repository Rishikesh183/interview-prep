"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWorkspaceStore } from "@/store/workspace";

const SEP = "\u0000";

/** Select options for canvas nodes of the given types, e.g. "Redis (n4)". */
export function useNodeOptions(types: readonly string[]): { value: string; label: string }[] {
  // Encoded as strings so the shallow compare keeps the selector stable across renders.
  const encoded = useWorkspaceStore(
    useShallow((s) =>
      s.nodes
        .filter((n) => types.includes(n.type ?? ""))
        .map((n) => `${n.id}${SEP}${n.data.label}`),
    ),
  );
  return useMemo(
    () =>
      encoded.map((e) => {
        const [value, label] = e.split(SEP);
        return { value, label: `${label} (${value})` };
      }),
    [encoded],
  );
}
