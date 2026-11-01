"use client";

import { useId, useMemo } from "react";
import { Check, X } from "lucide-react";
import { GraphViewer } from "@/components/canvas/GraphViewer";
import { Markdown } from "@/components/content/Markdown";
import type { Problem, ReferenceApproach } from "@/lib/schema";
import { runTests } from "@/lib/tests/engine";
import { BuildHld } from "./BuildHld";
import { RequestFlows } from "./RequestFlows";
import { Apis, Entities, Lines } from "./ReferenceCards";

const sections = [
  ["overview", "Overview"],
  ["requirements", "Requirements"],
  ["estimation", "Estimation"],
  ["entities", "Entities"],
  ["apis", "APIs & contracts"],
  ["build", "Build the HLD"],
  ["flows", "Request flows"],
  ["hld", "Final HLD"],
  ["tradeoffs", "Trade-offs"],
] as const;

export function ApproachWalkthrough({
  problem,
  approach,
}: {
  problem: Problem;
  approach: ReferenceApproach;
}) {
  const prefix = useId().replace(/:/g, "");
  const w = approach.walkthrough;
  const results = useMemo(
    () =>
      approach.graph
        ? runTests(problem.tests, {
            graph: approach.graph,
            apis: approach.apis,
            entities: approach.entities,
          })
        : [],
    [problem.tests, approach],
  );
  const anchor = (id: string) => `${prefix}-${approach.id}-${id}`;
  const section = (id: string, title: string, children: React.ReactNode) => (
    <section id={anchor(id)} className="scroll-mt-20 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[180px_minmax(0,1fr)]">
      <aside>
        <nav
          aria-label="Solution sections"
          className="bg-background/95 sticky top-3 flex flex-wrap gap-1 rounded-xl border p-2 lg:flex-col"
        >
          {sections.map(([id, title], i) => (
            <a
              key={id}
              href={`#${anchor(id)}`}
              className="hover:bg-accent rounded-md px-3 py-2 text-xs"
            >
              <span className="text-muted-foreground mr-2 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              {title}
            </a>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 space-y-10">
        {section(
          "overview",
          "Understand this approach",
          <div className="bg-muted/30 space-y-3 rounded-xl border p-5">
            <p className="leading-relaxed">{w?.overview ?? approach.summary}</p>
            <p className="text-muted-foreground text-sm">
              Follow each stage to see what to add, where it belongs, and why.{" "}
              <a className="text-primary underline" href={`#${anchor("hld")}`}>
                View final HLD →
              </a>
            </p>
          </div>,
        )}
        {w && w.limitations.length > 0 && (
          <div className="rounded-xl border border-amber-500/50 bg-amber-500/5 p-4">
            <Lines title="Requirement trade-offs in this alternative" items={w.limitations} />
          </div>
        )}
        {section(
          "requirements",
          "1. Set the scope",
          <>
            <Lines title="Functional requirements" items={problem.functionalReqs} />
            <Lines title="Non-functional requirements" items={problem.nonFunctionalReqs} />
            {problem.outOfScope.length > 0 && (
              <Lines title="Out of scope" items={problem.outOfScope} />
            )}
          </>,
        )}
        {section(
          "estimation",
          "2. Estimate and choose capacity",
          <>
            <dl className="bg-muted/30 grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2">
              {Object.entries(problem.scale)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-muted-foreground text-xs">
                      {{
                        dau: "Traffic assumptions",
                        qps: "Throughput",
                        storage: "Storage",
                        notes: "Notes",
                      }[k] ?? k}
                    </dt>
                    <dd className="mt-1">{v}</dd>
                  </div>
                ))}
            </dl>
            {w?.estimation.map((e, i) => (
              <div key={i} className="space-y-2 rounded-xl border p-4 text-sm">
                <p className="font-medium">{e.assumption}</p>
                <code className="block text-xs break-words whitespace-pre-wrap">
                  {e.calculation}
                </code>
                <p>{e.result}</p>
                <p className="text-muted-foreground">Design implication: {e.implication}</p>
              </div>
            ))}
          </>,
        )}
        {section(
          "entities",
          "3. Add entities and choose their stores",
          <Entities entities={approach.entities} graph={approach.graph} walkthrough={w} />,
        )}
        {section(
          "apis",
          "4. Define APIs and contracts under their owners",
          <Apis apis={approach.apis} graph={approach.graph} walkthrough={w} />,
        )}
        {section(
          "build",
          "5. Build the HLD, step by step",
          w && approach.graph ? (
            <BuildHld key={approach.id} approach={approach} />
          ) : (
            <p className="text-muted-foreground text-sm">
              Construction steps have not been authored for this legacy approach.
            </p>
          ),
        )}
        {section(
          "flows",
          "6. Walk through requests and branches",
          w && approach.graph ? (
            <RequestFlows key={approach.id} approach={approach} />
          ) : (
            <p className="text-muted-foreground text-sm">
              Flow explanations have not been authored for this legacy approach.
            </p>
          ),
        )}
        {section(
          "hld",
          "7. Final high-level design",
          approach.graph ? (
            <div className="h-[520px] overflow-hidden rounded-xl border">
              <GraphViewer
                graph={approach.graph}
                apis={approach.apis}
                entities={approach.entities}
                walkthrough={w}
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Final diagram has not been authored for this legacy approach.
            </p>
          ),
        )}
        {section(
          "tradeoffs",
          "8. Explain decisions and failure handling",
          <>
            <Markdown>
              {w ? approach.body.split(/^## Failure handling/m)[0].trim() : approach.body}
            </Markdown>
            {w?.failureCases.map((f, i) => (
              <article key={i} className="rounded-xl border p-4 text-sm">
                <h3 className="font-semibold">{f.scenario}</h3>
                <p className="text-muted-foreground mt-2 leading-relaxed">{f.handling}</p>
              </article>
            ))}
            {w && (
              <div className="bg-muted/30 rounded-xl border p-4 text-sm">
                <h3 className="mb-2 font-semibold">When to choose another approach</h3>
                <p>{w.alternatives}</p>
              </div>
            )}
            <Lines title="What interviewers probe next" items={problem.deepDives} />
            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer text-sm font-medium">
                Checks this reference passes
              </summary>
              <ul className="mt-3 space-y-2">
                {problem.tests.map((t) => {
                  const passed = results.find((r) => r.id === t.id)?.passed;
                  return (
                    <li key={t.id} className="flex items-start gap-2 text-sm">
                      {passed ? (
                        <Check className="size-4 shrink-0 text-emerald-600" />
                      ) : (
                        <X className="text-muted-foreground size-4 shrink-0" />
                      )}
                      <span>
                        {t.title}
                        {t.kind === "bonus" && " (bonus)"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </details>
          </>,
        )}
      </div>
    </div>
  );
}
