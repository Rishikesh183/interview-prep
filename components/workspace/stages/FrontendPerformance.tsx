"use client";
import { Textarea } from "@/components/ui/textarea";
import { useAttemptStore } from "@/store/attempt";
import type { Problem } from "@/lib/schema";
import { StageIntro } from "./StageIntro";

export function FrontendPerformance({ problem }: { problem: Problem }) {
  const notes = useAttemptStore((s) => s.meta?.estimation.notes ?? "");
  const setEstimation = useAttemptStore((s) => s.setEstimation);
  return (
    <div className="space-y-6">
      <StageIntro
        title="Performance budgets"
        text="Use browser workloads to justify rendering, data fetching and memory decisions. State assumptions and how you would measure them."
      />
      <div className="bg-muted/30 space-y-2 rounded-lg border p-4 text-sm">
        <p className="font-medium">Interview workload</p>
        <p>{problem.scale.notes}</p>
        <p>{problem.scale.storage}</p>
      </div>
      <ul className="text-muted-foreground list-disc space-y-2 pl-5 text-sm">
        <li>Choose a representative device, network and data size.</li>
        <li>Budget initial bytes, visible elements, retained data and expensive updates.</li>
        <li>Explain keyboard/focus behavior, loading, empty and failure states.</li>
        <li>
          Describe lab profiling and field measurements. Written targets are assumptions, not
          measured results.
        </li>
      </ul>
      <label htmlFor="performance-plan" className="block text-sm font-medium">
        Budgets, calculations and measurement plan
      </label>
      <Textarea
        id="performance-plan"
        rows={12}
        value={notes}
        onChange={(e) => setEstimation({ notes: e.target.value })}
        placeholder={
          "Device / network:\nWorkload and calculations:\nRendering and memory budget:\nNetwork and cache policy:\nProfiling and field metrics:"
        }
      />
    </div>
  );
}
