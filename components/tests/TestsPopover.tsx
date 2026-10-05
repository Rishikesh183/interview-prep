"use client";

import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFocusOnCanvas } from "@/components/canvas/useFocusOnCanvas";
import { runTestsNow } from "@/components/workspace/actions";
import type { Problem } from "@/lib/schema";
import { scoreTests } from "@/lib/tests/score";
import { useAttemptStore } from "@/store/attempt";
import { TestRunner } from "./TestRunner";

const POPOVER_WIDTH_PX = 448; // w-[28rem]

/** Tests next to the canvas: opening runs them; each test can highlight its nodes in place. */
export function TestsPopover({ problem }: { problem: Problem }) {
  const testRun = useAttemptStore((s) => s.meta?.testRun);
  const focusOnCanvas = useFocusOnCanvas({ reserveRightPx: POPOVER_WIDTH_PX + 24 });
  const score = testRun ? scoreTests(problem.tests, testRun.results) : null;

  return (
    <Popover onOpenChange={(open) => open && runTestsNow(problem)}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FlaskConical />
          Tests
          {score && (
            <span className={score.solved ? "text-emerald-600" : "text-muted-foreground"}>
              {score.corePassed}/{score.coreTotal}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[70vh] w-[28rem] overflow-y-auto">
        <TestRunner problem={problem} onShow={focusOnCanvas} compact />
      </PopoverContent>
    </Popover>
  );
}
