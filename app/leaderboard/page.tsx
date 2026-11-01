import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { LeaderboardView } from "@/components/leaderboard/LeaderboardView";

export const metadata: Metadata = { title: "All-time leaderboard · SysDesign Arena" };

export default function LeaderboardPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Keep practising. Keep climbing.
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">All-time leaderboard</h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Your best points from every backend and frontend question, added together. Improve a
            previous attempt to climb the rankings.
          </p>
        </div>
        <LeaderboardView />
      </main>
    </>
  );
}
