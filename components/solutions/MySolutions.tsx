"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Pencil, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { GraphViewer } from "@/components/canvas/GraphViewer";
import { Button } from "@/components/ui/button";
import { listAttempts } from "@/lib/db/attempts";
import {
  deleteMySolution,
  listMySolutions,
  renameMySolution,
  saveMySolution,
} from "@/lib/db/mySolutions";
import { CATALOG } from "@/lib/catalog/components";
import type { Attempt, Graph, Problem } from "@/lib/schema";

type Option = { id: string; label: string; graph: Graph };

const when = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Save submitted designs under a name; compare any two (or one against a reference). */
export function MySolutions({ problem }: { problem: Problem }) {
  const submitted = useLiveQuery(
    async () => (await listAttempts(problem.id)).filter((a) => a.status !== "in_progress"),
    [problem.id],
  );
  const saved = useLiveQuery(() => listMySolutions(problem.id), [problem.id]);

  const options: Option[] = [
    ...(saved ?? []).map((s) => ({ id: s.id, label: `Mine: ${s.title}`, graph: s.graph })),
    ...problem.references.flatMap((r) =>
      r.graph ? [{ id: `ref:${r.id}`, label: `Reference: ${r.name}`, graph: r.graph }] : [],
    ),
  ];

  const onSave = async (a: Attempt) => {
    const name = window.prompt(
      "Name this solution",
      `${when(a.submittedAt ?? a.updatedAt)} · ${a.points ?? 0} pts`,
    );
    if (name === null) return;
    await saveMySolution(a, name);
    toast.success("Saved to My solutions");
  };
  const onRename = async (id: string, title: string) => {
    const name = window.prompt("Rename solution", title);
    if (name !== null) await renameMySolution(id, name);
  };
  const onDelete = async (id: string, title: string) => {
    if (window.confirm(`Delete "${title}"?`)) await deleteMySolution(id);
  };

  if (!submitted || !saved) return null;
  const savedFrom = new Set(saved.map((s) => s.attemptId));

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="text-base font-semibold">Saved solutions</h2>
        {saved.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            None yet. Save one of your submitted attempts below.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {saved.map((s) => (
              <li key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="font-medium">{s.title}</span>
                <span className="text-muted-foreground text-xs">
                  {s.graph.nodes.length} components · saved {when(s.createdAt)}
                </span>
                <div className="ml-auto flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Rename ${s.title}`}
                    onClick={() => void onRename(s.id, s.title)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${s.title}`}
                    onClick={() => void onDelete(s.id, s.title)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Your submitted attempts</h2>
        {submitted.length === 0 ? (
          <p className="text-muted-foreground text-sm">No submitted attempts yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {submitted.map((a) => (
              <li key={a.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span>{when(a.submittedAt ?? a.updatedAt)}</span>
                <span className="text-muted-foreground text-xs">
                  {a.points ?? 0} pts · {a.graph.nodes.length} components
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  disabled={savedFrom.has(a.id)}
                  onClick={() => void onSave(a)}
                >
                  <Save /> {savedFrom.has(a.id) ? "Saved" : "Save as solution"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {options.length >= 2 && <Compare options={options} />}
    </div>
  );
}

function Compare({ options }: { options: Option[] }) {
  const [leftId, setLeft] = useState(options[0].id);
  const [rightId, setRight] = useState(options[1].id);
  const left = options.find((o) => o.id === leftId) ?? options[0];
  const right = options.find((o) => o.id === rightId) ?? options[1];
  const types = (g: Graph) => new Set(g.nodes.map((n) => n.type).filter((t) => t !== "note"));
  const [a, b] = [types(left.graph), types(right.graph)];
  const label = (t: string) => CATALOG[t]?.label ?? t;
  const onlyA = [...a].filter((t) => !b.has(t)).map(label);
  const onlyB = [...b].filter((t) => !a.has(t)).map(label);

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">Compare side by side</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          { o: left, set: setLeft, only: onlyA },
          { o: right, set: setRight, only: onlyB },
        ].map(({ o, set, only }, i) => (
          <div key={i} className="overflow-hidden rounded-lg border">
            <div className="bg-muted/50 border-b px-2 py-1.5">
              <select
                aria-label={i === 0 ? "Left design" : "Right design"}
                className="bg-background w-full rounded border px-1.5 py-1 text-xs"
                value={o.id}
                onChange={(e) => set(e.target.value)}
              >
                {options.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-[380px]">
              <GraphViewer key={o.id} graph={o.graph} />
            </div>
            <div className="text-muted-foreground border-t px-3 py-2 text-xs">
              {only.length
                ? `Only here: ${only.join(", ")}`
                : "No component types unique to this side."}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
