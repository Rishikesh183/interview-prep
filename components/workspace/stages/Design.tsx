"use client";

import { Canvas } from "@/components/canvas/Canvas";
import { InspectorPanel } from "@/components/canvas/InspectorPanel";
import { Palette } from "@/components/canvas/Palette";
import { Toolbar } from "@/components/canvas/Toolbar";
import { useAddNode } from "@/components/canvas/useAddNode";
import { LintDrawer } from "@/components/lint/LintDrawer";
import { TestsPopover } from "@/components/tests/TestsPopover";
import type { Problem } from "@/lib/schema";

type Props = { readOnly: boolean; fileBase: string; problem?: Problem };

export function Design({ readOnly, fileBase, problem }: Props) {
  const { addAtCenter } = useAddNode();

  return (
    <div className="flex h-full min-h-0">
      {!readOnly && (
        <aside className="w-56 shrink-0 border-r">
          <Palette onAdd={addAtCenter} />
        </aside>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="relative flex h-10 shrink-0 items-center justify-center border-b">
          <Toolbar fileBase={fileBase} readOnly={readOnly} />
          {problem && (
            <div className="absolute right-2">
              <TestsPopover problem={problem} />
            </div>
          )}
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
