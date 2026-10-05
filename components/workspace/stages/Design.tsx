"use client";

import { Canvas } from "@/components/canvas/Canvas";
import { InspectorPanel } from "@/components/canvas/InspectorPanel";
import { Palette } from "@/components/canvas/Palette";
import { Toolbar } from "@/components/canvas/Toolbar";
import { useAddNode } from "@/components/canvas/useAddNode";
import { LintDrawer } from "@/components/lint/LintDrawer";

export function Design({ readOnly, fileBase }: { readOnly: boolean; fileBase: string }) {
  const { addAtCenter } = useAddNode();

  return (
    <div className="flex h-full min-h-0">
      {!readOnly && (
        <aside className="w-56 shrink-0 border-r">
          <Palette onAdd={addAtCenter} />
        </aside>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center justify-center border-b">
          <Toolbar fileBase={fileBase} readOnly={readOnly} />
        </div>
        <div className="relative min-h-0 flex-1">
          <Canvas readOnly={readOnly} />
        </div>
        <LintDrawer showHintToggle />
      </div>
      <aside className="w-80 shrink-0 border-l">
        <fieldset disabled={readOnly} className="contents">
          <InspectorPanel />
        </fieldset>
      </aside>
    </div>
  );
}
