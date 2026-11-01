"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Award, Crown, Loader2, LogIn, RefreshCw, Trophy, Users } from "lucide-react";
import { useAuth } from "@/components/auth/useAuth";
import { Button } from "@/components/ui/button";
import { LeaderboardSchema, type Leaderboard, type LeaderboardEntry } from "@/lib/schema";
import { useSyncStatus } from "@/lib/sync/worker";
import { cn } from "@/lib/utils";

const number = new Intl.NumberFormat("en-IN");

export function LeaderboardView() {
  const { status, user } = useAuth();
  const syncedAt = useSyncStatus((s) => s.lastSyncedAt);
  const syncStatus = useSyncStatus((s) => s.status);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{ viewer: string; data?: Leaderboard; error?: string }>();
  const [loading, setLoading] = useState(false);
  const userId = user?.id;

  useEffect(() => {
    if (status !== "signed-in" || !userId) {
      setResult(undefined);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    void (async () => {
      try {
        const response = await fetch("/api/leaderboard", {
          cache: "no-store",
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Couldn't load the leaderboard.");
        const data = LeaderboardSchema.parse(body);
        if (data.viewer_id !== userId)
          throw new Error("Your account changed. Refresh the leaderboard.");
        if (!controller.signal.aborted) setResult({ viewer: userId, data });
      } catch (error) {
        if (!controller.signal.aborted)
          setResult({
            viewer: userId,
            error: error instanceof Error ? error.message : "Couldn't load the leaderboard.",
          });
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [status, userId, refresh, syncedAt]);

  if (status === "loading") return <Loading />;
  if (status !== "signed-in" || !userId)
    return (
      <section className="bg-muted/20 flex flex-col items-center gap-3 rounded-xl border px-6 py-12 text-center">
        <div className="bg-primary/5 flex size-14 items-center justify-center rounded-full">
          <Trophy className="size-6" />
        </div>
        <h2 className="font-semibold">Practise together. See how you stack up.</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          {status === "disabled"
            ? "The shared leaderboard isn't available in local-only mode. Your local practice and history are still available."
            : "Sign in to see the rankings and your all-time points. Only synced best scores count; your attempt history stays on your device."}
        </p>
        {status !== "disabled" && (
          <Button asChild>
            <Link href="/login?next=%2Fleaderboard">
              <LogIn /> Sign in to view leaderboard
            </Link>
          </Button>
        )}
      </section>
    );

  const current = result?.viewer === userId ? result : undefined;
  const data = current?.data;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">
          All time · Both tracks · Best score per question
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => setRefresh((v) => v + 1)}
        >
          <RefreshCw className={cn(loading && "animate-spin")} /> Refresh rankings
        </Button>
      </div>
      {current?.error ? (
        <section
          role="alert"
          className="border-destructive/30 bg-destructive/5 space-y-3 rounded-xl border p-6"
        >
          <p className="font-medium">Rankings could not be loaded</p>
          <p className="text-muted-foreground text-sm">{current.error}</p>
          <Button variant="outline" onClick={() => setRefresh((v) => v + 1)}>
            Try again
          </Button>
        </section>
      ) : !data ? (
        <Loading />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              icon={<Award className="size-4" />}
              label="Your rank"
              value={data.current_user ? `#${data.current_user.rank}` : "Unranked"}
              detail={
                data.current_user
                  ? `${data.current_user.solved_count} of ${data.problem_count} questions solved`
                  : "Submit a question to join"
              }
            />
            <Stat
              icon={<Trophy className="size-4" />}
              label="Your all-time points"
              value={number.format(data.current_user?.total_points ?? 0)}
              detail={`${number.format(data.maximum_points)} points available across both tracks`}
            />
            <Stat
              icon={<Users className="size-4" />}
              label="Designers on the board"
              value={number.format(data.total_participants)}
              detail="Accounts with synced submissions"
            />
          </div>
          {syncStatus === "error" || syncStatus === "offline" ? (
            <p role="status" className="text-muted-foreground text-sm">
              Your latest result may still be waiting to sync. Rankings update after you are back
              online and sync succeeds.
            </p>
          ) : null}
          {data.entries.length === 0 ? (
            <section className="bg-muted/20 space-y-3 rounded-xl border border-dashed p-10 text-center">
              <Trophy className="mx-auto size-8 text-amber-500" />
              <h2 className="font-semibold">The first place is waiting.</h2>
              <p className="text-muted-foreground text-sm">
                Submit your first question and sync your progress to start the board.
              </p>
              <Button asChild>
                <Link href="/">
                  Choose a question <ArrowRight />
                </Link>
              </Button>
            </section>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  All-time points leaderboard. Equal point totals share a rank.
                </caption>
                <thead className="bg-muted/40 text-muted-foreground border-b text-xs">
                  <tr>
                    <th scope="col" className="w-20 px-4 py-3">
                      Rank
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Designer
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Solved
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry) => (
                    <Standing key={entry.user_id} entry={entry} me={entry.user_id === userId} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.current_user && !data.entries.some((e) => e.user_id === userId) && (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <caption className="text-muted-foreground px-4 py-2 text-left text-xs">
                  Your place outside the top 100
                </caption>
                <tbody>
                  <Standing entry={data.current_user} me />
                </tbody>
              </table>
            </div>
          )}
          <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
            <p>
              Equal points share a rank. Retakes count once, at your best score.
              {data.total_participants > 100 && " Showing the top 100."}
            </p>
            <p>
              Updated{" "}
              {new Date(data.updated_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="flex justify-end">
            <Button asChild variant="ghost" size="sm">
              <Link href="/progress">
                View your progress <ArrowRight />
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <section className="space-y-2 rounded-xl border p-5">
      <div className="text-muted-foreground flex items-center gap-2 text-xs">
        {icon}
        {label}
      </div>
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{detail}</p>
    </section>
  );
}

function Standing({ entry, me }: { entry: LeaderboardEntry; me: boolean }) {
  return (
    <tr className={cn("border-t first:border-t-0", me ? "bg-primary/5" : "hover:bg-muted/30")}>
      <td className="px-4 py-4">
        <span
          className={cn(
            "inline-flex size-8 items-center justify-center rounded-full font-semibold tabular-nums",
            entry.rank === 1
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              : entry.rank <= 3
                ? "bg-muted text-foreground"
                : "text-muted-foreground",
          )}
          title={entry.rank === 1 ? "First place" : undefined}
        >
          {entry.rank === 1 ? <Crown aria-label="Rank 1" className="size-4" /> : entry.rank}
        </span>
      </td>
      <th scope="row" className="px-4 py-4 font-medium">
        <div className="flex items-center gap-2">
          <span className="max-w-32 truncate sm:max-w-80">{entry.display_name}</span>
          {me && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px]">
              You
            </span>
          )}
        </div>
      </th>
      <td className="px-4 py-4 text-right tabular-nums">{number.format(entry.solved_count)}</td>
      <td className="px-4 py-4 text-right font-semibold tabular-nums">
        {number.format(entry.total_points)}
      </td>
    </tr>
  );
}

function Loading() {
  return (
    <div
      role="status"
      className="text-muted-foreground flex items-center justify-center gap-2 rounded-xl border p-12 text-sm"
    >
      <Loader2 className="size-4 animate-spin" /> Loading rankings…
    </div>
  );
}
