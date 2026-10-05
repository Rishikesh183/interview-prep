"use client";

import { CheckCircle2, CircleDashed, Search, Star } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SimpleSelect } from "@/components/form/SimpleSelect";
import { statusByProblem, type ProblemStatus } from "@/lib/attempts/status";
import type { Difficulty, ProblemSummary } from "@/lib/schema";
import { DifficultyBadge } from "./DifficultyBadge";
import { useAttempts } from "./useAttempts";
import { useProgress } from "./useProgress";
import { BASE_POINTS } from "@/lib/points";

const STATUS_OPTIONS = [
  { value: "todo", label: "To do" },
  { value: "attempted", label: "Attempted" },
  { value: "solved", label: "Solved" },
];

function StatusIcon({ status }: { status: ProblemStatus }) {
  if (status === "solved") {
    return <CheckCircle2 className="size-4 text-emerald-600" aria-label="Solved" />;
  }
  if (status === "attempted") {
    return <CircleDashed className="size-4 text-amber-600" aria-label="Attempted" />;
  }
  return <span className="sr-only">To do</span>;
}

export function ProblemTable({ problems }: { problems: ProblemSummary[] }) {
  const attempts = useAttempts();
  const statuses = useMemo(() => statusByProblem(attempts ?? []), [attempts]);
  const progress = useProgress();
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>();
  const [status, setStatus] = useState<ProblemStatus>();
  const [tag, setTag] = useState<string>();
  const [priorityOnly, setPriorityOnly] = useState(false);

  const tags = useMemo(() => [...new Set(problems.flatMap((p) => p.tags))].sort(), [problems]);
  const rows = problems.filter((p) => {
    const q = query.trim().toLowerCase();
    return (
      (!q || p.title.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q))) &&
      (!difficulty || p.difficulty === difficulty) &&
      (!status || (statuses.get(p.id) ?? "todo") === status) &&
      (!tag || p.tags.includes(tag)) &&
      (!priorityOnly || p.priority)
    );
  });
  const solved = problems.filter((p) => statuses.get(p.id) === "solved").length;
  const totalPoints = [...(progress?.values() ?? [])].reduce((sum, p) => sum + p.bestPoints, 0);
  const maxPoints = problems.reduce((sum, p) => sum + BASE_POINTS[p.difficulty], 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            className="pl-8"
            placeholder="Search problems or tags"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-36">
          <SimpleSelect
            value={difficulty}
            options={["easy", "medium", "hard"]}
            allowNone
            placeholder="Difficulty"
            onChange={(v) => setDifficulty(v as Difficulty | undefined)}
          />
        </div>
        <div className="w-36">
          <SimpleSelect
            value={status}
            options={STATUS_OPTIONS}
            allowNone
            placeholder="Status"
            onChange={(v) => setStatus(v as ProblemStatus | undefined)}
          />
        </div>
        <div className="w-44">
          <SimpleSelect value={tag} options={tags} allowNone placeholder="Tag" onChange={setTag} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={priorityOnly} onCheckedChange={setPriorityOnly} />
          Do these first
        </label>
        <span className="text-muted-foreground ml-auto text-sm">
          {solved}/{problems.length} solved ·{" "}
          <span className="text-foreground font-medium tabular-nums">{totalPoints}</span> /{" "}
          {maxPoints} points
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left text-xs">
            <tr>
              <th className="w-10 px-3 py-2">#</th>
              <th className="w-8 px-1 py-2" aria-label="Status" />
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Difficulty</th>
              <th className="hidden px-3 py-2 md:table-cell">Tags</th>
              <th className="px-3 py-2 text-right">Tests</th>
              <th className="px-3 py-2 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-muted/40 border-t">
                <td className="text-muted-foreground px-3 py-2.5 tabular-nums">{p.number}</td>
                <td className="px-1 py-2.5">
                  <StatusIcon status={statuses.get(p.id) ?? "todo"} />
                </td>
                <td className="px-3 py-2.5">
                  <Link
                    href={`/problems/${p.id}`}
                    className="flex items-center gap-1.5 font-medium hover:underline"
                  >
                    {p.title}
                    {p.priority && (
                      <Star
                        className="size-3.5 fill-amber-400 text-amber-400"
                        aria-label="Do these first"
                      />
                    )}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <DifficultyBadge difficulty={p.difficulty} />
                </td>
                <td className="hidden px-3 py-2.5 md:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {p.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="text-muted-foreground px-3 py-2.5 text-right tabular-nums">
                  {p.testCount}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <span
                    className={
                      progress?.get(p.id)?.bestPoints ? "font-medium" : "text-muted-foreground"
                    }
                  >
                    {progress?.get(p.id)?.bestPoints ?? 0}
                  </span>
                  <span className="text-muted-foreground"> / {BASE_POINTS[p.difficulty]}</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-muted-foreground px-3 py-10 text-center">
                  No problems match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
