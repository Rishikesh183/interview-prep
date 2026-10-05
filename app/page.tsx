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
            Work through requirements, estimation, data model, APIs and the design, then run the
            tests. Starred problems come up most often in interviews.
          </p>
        </div>
        <ProblemTable problems={problemSummaries()} />
      </main>
    </>
  );
}
