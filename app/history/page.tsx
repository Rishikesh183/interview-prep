import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { HistoryTable } from "@/components/history/HistoryTable";
import { problemSummaries } from "@/lib/problems/load";

export const metadata: Metadata = { title: "History · SysDesign Arena" };

export default function HistoryPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">History</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every attempt is saved in this browser. Open one to continue or review it.
          </p>
        </div>
        <HistoryTable problems={problemSummaries()} />
      </main>
    </>
  );
}
