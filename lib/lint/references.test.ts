import { describe, expect, it } from "vitest";
import { loadProblems } from "@/lib/problems/load";
import { runLint } from "./index";

/** Reference designs are meant to be exemplary, so the linter should have nothing to say. */
describe("reference designs", () => {
  const cases = loadProblems().flatMap((p) =>
    p.references.filter((r) => r.graph).map((r) => ({ p, r, name: `${p.id}/${r.id}` })),
  );

  it.each(cases)("$name has no lint errors or warnings", ({ p, r }) => {
    const issues = runLint({ graph: r.graph!, apis: r.apis, problem: p });
    expect(issues.filter((i) => i.severity !== "info").map((i) => i.message)).toEqual([]);
  });
});
