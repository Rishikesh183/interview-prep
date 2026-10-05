import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { ProgressView } from "@/components/progress/ProgressView";
import { problemSummaries } from "@/lib/problems/load";

export const metadata: Metadata = { title: "Progress · SysDesign Arena" };

export default function ProgressPage() {
  const problems = problemSummaries().map(({ id, number, title, difficulty, tags }) => ({
    id,
    number,
    title,
    difficulty,
    tags,
  }));
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Only your best attempt per problem counts.
          </p>
        </div>
        <ProgressView problems={problems} />
      </main>
    </>
  );
}
