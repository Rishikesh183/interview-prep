"use client";

import { ArrowRight, Award, Flame, Target } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { DifficultyBadge } from "@/components/problems/DifficultyBadge";
import { useAttempts } from "@/components/problems/useAttempts";
import { useProgress } from "@/components/problems/useProgress";
import {
  nextUp,
  pointsTotal,
  solvedByDifficulty,
  streak,
  topicMastery,
  type ProblemRef,
} from "@/lib/progress/stats";

/** Points, solved counts, streak, topic mastery and what to do next, from local data. */
export function ProgressView({ problems }: { problems: ProblemRef[] }) {
  const progress = useProgress();
  const attempts = useAttempts();

  const stats = useMemo(() => {
    if (!progress || !attempts) return null;
    const submits = attempts.flatMap((a) =>
      a.status !== "in_progress" && a.submittedAt ? [a.submittedAt] : [],
    );
    return {
      points: pointsTotal(problems, progress),
      byDifficulty: solvedByDifficulty(problems, progress),
      streak: streak(submits, Date.now()),
      mastery: topicMastery(problems, progress),
      next: nextUp(problems, progress),
    };
  }, [problems, progress, attempts]);

  if (!stats) return null;
  const solvedTotal = stats.byDifficulty.reduce((s, d) => s + d.solved, 0);
  // Strongest first reads better on screen.
  const mastery = [...stats.mastery].reverse();

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={<Award className="size-5 text-amber-500" />} label="Points">
          {stats.points.earned}
          <span className="text-muted-foreground text-sm font-normal">
            {" "}
            / {stats.points.possible}
          </span>
        </Stat>
        <Stat icon={<Target className="size-5 text-emerald-600" />} label="Solved">
          {solvedTotal}
          <span className="text-muted-foreground text-sm font-normal"> / {problems.length}</span>
        </Stat>
        <Stat
          icon={<Flame className="size-5 text-orange-500" />}
          label={`Day streak (IST) · longest ${stats.streak.longest}`}
        >
          {stats.streak.current}
        </Stat>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Solved by difficulty</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {stats.byDifficulty.map((d) => (
            <div key={d.difficulty} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <DifficultyBadge difficulty={d.difficulty} />
                <span className="text-sm tabular-nums">
                  {d.solved} / {d.total}
                </span>
              </div>
              <Bar value={d.total ? d.solved / d.total : 0} />
            </div>
          ))}
        </div>
      </section>

      {stats.next && (
        <section className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-4">
          <div>
            <div className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Next up
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-medium">
                {stats.next.problem.number}. {stats.next.problem.title}
              </span>
              <DifficultyBadge difficulty={stats.next.problem.difficulty} />
            </div>
            <div className="text-muted-foreground text-xs">
              Your weakest topic is <span className="font-medium">{stats.next.tag}</span>.
            </div>
          </div>
          <Link
            href={`/problems/${stats.next.problem.id}`}
            className="bg-primary text-primary-foreground ml-auto inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm"
          >
            Start <ArrowRight className="size-4" />
          </Link>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Topic mastery</h2>
        <p className="text-muted-foreground text-xs">
          Average best test score over every problem with the tag (unattempted problems count as 0).
        </p>
        <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {mastery.map((m) => (
            <li key={m.tag} className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span>{m.tag}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {Math.round(m.mastery * 100)}% · {m.solved}/{m.total} solved
                </span>
              </div>
              <Bar value={m.mastery} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      {icon}
      <div>
        <div className="text-2xl font-semibold tabular-nums">{children}</div>
        <div className="text-muted-foreground text-xs">{label}</div>
      </div>
    </div>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div className="bg-muted h-2 overflow-hidden rounded-full">
      <div
        className="bg-primary h-full rounded-full transition-[width]"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </div>
  );
}
