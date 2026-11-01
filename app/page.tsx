import { AppHeader } from "@/components/AppHeader";
import { ProblemTable } from "@/components/problems/ProblemTable";
import { problemSummaries } from "@/lib/problems/load";

export default function Home() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Problems</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Build your architecture step by step, run design checks and compare guided solutions.
            Backend is the main track; frontend adds 15 focused interview exercises. Stars mark
            recommended starting points.
          </p>
        </div>
        <ProblemTable problems={problemSummaries()} />
      </main>
    </>
  );
}
