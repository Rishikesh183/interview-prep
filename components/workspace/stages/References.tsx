"use client";

import { ReferenceCompare } from "@/components/review/ReferenceCompare";
import type { Problem } from "@/lib/schema";
import { useAttemptStore } from "@/store/attempt";

function Column({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        {title}
      </h4>
      {items.length ? (
        <ul className="list-disc space-y-1 pl-4 text-sm">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm italic">{empty}</p>
      )}
    </div>
  );
}

/** Unlocked after submission: reference requirements side by side, then the approaches. */
export function References({ problem }: { problem: Problem }) {
  const reqs = useAttemptStore((s) => s.meta?.requirements);
  if (!reqs) return null;

  const rows = [
    { title: "Functional", mine: reqs.functional, ref: problem.functionalReqs },
    { title: "Non-functional", mine: reqs.nonFunctional, ref: problem.nonFunctionalReqs },
    { title: "Out of scope", mine: reqs.outOfScope, ref: problem.outOfScope },
  ];

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-base font-semibold">Requirements: yours vs reference</h3>
        {rows.map((row) => (
          <div key={row.title} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
            <Column
              title={`Your ${row.title.toLowerCase()}`}
              items={row.mine}
              empty="None written"
            />
            <Column title={`Reference ${row.title.toLowerCase()}`} items={row.ref} empty="None" />
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Column title="Deep dives an interviewer would probe" items={problem.deepDives} empty="—" />
        <Column title="What strong answers cover" items={problem.rubricFocus} empty="—" />
      </section>

      <section className="space-y-4">
        <h3 className="text-base font-semibold">Reference approaches</h3>
        <p className="text-muted-foreground text-sm">
          There is no single right answer. These are common approaches and their trade-offs.
        </p>
        {problem.references.map((ref) => (
          <article key={ref.id} className="space-y-2 rounded-lg border p-4">
            <h4 className="font-medium">{ref.name}</h4>
            <p className="text-sm leading-relaxed">{ref.summary}</p>
            {ref.tradeoffs.length > 0 && (
              <ul className="text-muted-foreground list-disc space-y-0.5 pl-4 text-sm">
                {ref.tradeoffs.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>

      <ReferenceCompare problem={problem} />
    </div>
  );
}
