"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Check, Lock, X } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { GraphViewer } from "@/components/canvas/GraphViewer";
import { Markdown } from "@/components/content/Markdown";
import { DifficultyBadge } from "@/components/problems/DifficultyBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/db/dexie";
import { markSolutionsPeeked } from "@/lib/db/mySolutions";
import type { ApiEndpoint, Entity, Problem, ReferenceApproach } from "@/lib/schema";
import { runTests } from "@/lib/tests/engine";
import { cn } from "@/lib/utils";
import { MySolutions } from "./MySolutions";

/** Unlocked once the problem was submitted, or after "Unlock anyway" (PHASE-2 §3, §5). */
function useUnlocked(problemId: string): boolean | undefined {
  return useLiveQuery(async () => {
    const d = db();
    const [attempts, peek] = await Promise.all([
      d.attempts.where("problemId").equals(problemId).toArray(),
      d.meta.get(`peek:${problemId}`),
    ]);
    return peek !== undefined || attempts.some((a) => a.status !== "in_progress");
  }, [problemId]);
}

export function SolutionsView({ problem }: { problem: Problem }) {
  const unlocked = useUnlocked(problem.id);

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="space-y-2">
          <Link
            href={`/problems/${problem.id}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="size-3" /> Back to the problem
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground tabular-nums">#{problem.number}</span>
            <DifficultyBadge difficulty={problem.difficulty} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{problem.title}: solutions</h1>
        </div>

        {unlocked === undefined ? null : unlocked ? (
          <Unlocked problem={problem} />
        ) : (
          <Locked problem={problem} />
        )}
      </main>
    </>
  );
}

function Locked({ problem }: { problem: Problem }) {
  const onUnlock = () => {
    const ok = window.confirm(
      "Unlock the solutions before submitting? Your attempt in progress (and any new attempt before your first submit) will score 0 points.",
    );
    if (ok) void markSolutionsPeeked(problem.id);
  };
  return (
    <section className="space-y-3 rounded-lg border border-dashed p-6">
      <h2 className="flex items-center gap-2 font-medium">
        <Lock className="size-4" /> Solutions are locked
      </h2>
      <p className="text-muted-foreground text-sm">
        Submit an attempt at this problem first. Then you&apos;ll see {problem.references.length}{" "}
        reference approaches with diagrams, walkthroughs and the tests they pass.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={`/problems/${problem.id}`}>Attempt it</Link>
        </Button>
        <Button variant="outline" size="sm" onClick={onUnlock}>
          Unlock anyway (scores 0 until you submit)
        </Button>
      </div>
    </section>
  );
}

function Unlocked({ problem }: { problem: Problem }) {
  const first = problem.references[0]?.id ?? "mine";
  return (
    <Tabs defaultValue={first} className="space-y-4">
      <TabsList className="h-auto flex-wrap">
        {problem.references.map((r) => (
          <TabsTrigger key={r.id} value={r.id}>
            {r.name}
          </TabsTrigger>
        ))}
        <TabsTrigger value="mine">My solutions</TabsTrigger>
      </TabsList>
      {problem.references.map((r) => (
        <TabsContent key={r.id} value={r.id}>
          <Approach problem={problem} approach={r} />
        </TabsContent>
      ))}
      <TabsContent value="mine">
        <MySolutions problem={problem} />
      </TabsContent>
    </Tabs>
  );
}

function Approach({ problem, approach }: { problem: Problem; approach: ReferenceApproach }) {
  const results = useMemo(
    () =>
      approach.graph
        ? runTests(problem.tests, {
            graph: approach.graph,
            apis: approach.apis,
            entities: approach.entities,
          })
        : null,
    [problem.tests, approach],
  );
  const scale = Object.entries(problem.scale).filter(([, v]) => v);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0 space-y-8">
        {approach.graph ? (
          <div className="h-[440px] overflow-hidden rounded-lg border">
            <GraphViewer graph={approach.graph} />
          </div>
        ) : (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            This approach is described in words only (no diagram).
          </p>
        )}

        <Step n={1} title="Requirements">
          <List title="Functional" items={problem.functionalReqs} />
          <List title="Non-functional" items={problem.nonFunctionalReqs} />
          {problem.outOfScope.length > 0 && (
            <List title="Out of scope" items={problem.outOfScope} />
          )}
        </Step>

        <Step n={2} title="Estimation">
          <dl className="space-y-1 text-sm">
            {scale.map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted-foreground inline capitalize">{k}: </dt>
                <dd className="inline">{v}</dd>
              </div>
            ))}
          </dl>
        </Step>

        <Step n={3} title="Data model">
          <Entities entities={approach.entities} />
        </Step>

        <Step n={4} title="APIs">
          <Apis apis={approach.apis} />
        </Step>

        <Step n={5} title="Design">
          <Markdown>{approach.body}</Markdown>
        </Step>
      </div>

      <aside className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            What interviewers probe next
          </h3>
          <ul className="list-disc space-y-1 pl-4 text-sm">
            {problem.deepDives.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </section>
        <section className="space-y-2">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Tests it passes
          </h3>
          {results ? (
            <ul className="space-y-1 text-sm">
              {problem.tests.map((t) => {
                const passed = results.find((r) => r.id === t.id)?.passed;
                return (
                  <li key={t.id} className="flex items-start gap-1.5">
                    {passed ? (
                      <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <X className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                    )}
                    <span className={cn(!passed && "text-muted-foreground")}>
                      {t.title}
                      {t.kind === "bonus" && (
                        <span className="text-muted-foreground text-xs"> (bonus)</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No diagram, so no tests to run.</p>
          )}
        </section>
      </aside>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <span className="bg-muted flex size-6 items-center justify-center rounded-full text-xs">
          {n}
        </span>
        {title}
      </h2>
      <div className="space-y-3 pl-8">{children}</div>
    </section>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">
        {title}
      </h4>
      <ul className="list-disc space-y-0.5 pl-4 text-sm">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

export function Entities({ entities }: { entities: Entity[] }) {
  if (!entities.length) return <p className="text-muted-foreground text-sm">Not specified.</p>;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {entities.map((e) => (
        <div key={e.name} className="rounded-md border p-2">
          <div className="text-sm font-medium">{e.name}</div>
          <pre className="text-muted-foreground mt-1 font-mono text-xs whitespace-pre-wrap">
            {e.fields}
          </pre>
        </div>
      ))}
    </div>
  );
}

export function Apis({ apis }: { apis: ApiEndpoint[] }) {
  if (!apis.length) return <p className="text-muted-foreground text-sm">Not specified.</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {apis.map((a) => {
        const flags = [
          a.auth && "auth",
          a.idempotent && "idempotent",
          a.rateLimited && "rate-limited",
          a.pagination && a.pagination !== "none" && `${a.pagination} pagination`,
        ].filter(Boolean);
        return (
          <li key={a.id} className="rounded-md border px-2 py-1.5">
            <code className="font-mono text-xs">
              <span className="font-semibold">{a.method}</span> {a.path}
            </code>
            {flags.length > 0 && (
              <span className="text-muted-foreground ml-2 text-xs">{flags.join(" · ")}</span>
            )}
            {a.note && <div className="text-muted-foreground mt-0.5 text-xs">{a.note}</div>}
          </li>
        );
      })}
    </ul>
  );
}
