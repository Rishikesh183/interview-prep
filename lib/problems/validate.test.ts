import { describe, expect, it } from "vitest";
import type { RawProblemDir } from "@/lib/content/problemDir";
import { readProblemDirs } from "./load";
import { validateContent } from "./validate";

const test = (id: string, check: object, kind = "core") => ({
  id,
  title: `Test ${id}`,
  kind,
  check,
  failHint: "What would help here?",
});

const baseProblem = {
  id: "demo",
  number: 1,
  title: "Demo",
  difficulty: "easy",
  tags: ["caching"],
  prompt: "Design it.",
  functionalReqs: ["a"],
  nonFunctionalReqs: ["b"],
  scale: {},
  keyComponents: ["cache"],
  deepDives: ["x"],
  rubricFocus: [],
  prerequisites: ["caching-strategies"],
};
const baseTests = [
  test("t1", { hasNode: "cache" }),
  test("t2", { hasNode: "@client" }),
  test("t3", { pathExists: { from: "@client", to: "cache" } }),
  test("t4", { hasNode: "*" }),
  test("t5", { textMentions: { pattern: "ttl" } }, "bonus"),
  test("t6", { not: { hasNode: "cdn" } }),
];
const goodGraph = {
  v: 1,
  n: [
    { i: "c", t: "web_client", x: 0, y: 0 },
    { i: "r", t: "cache", x: 200, y: 0 },
  ],
  e: [{ i: "e1", s: "c", d: "r" }],
};

function dir(
  over: {
    problem?: object;
    tests?: object[];
    hints?: unknown;
    files?: Record<string, string>;
    name?: string;
  } = {},
): RawProblemDir {
  return {
    dir: over.name ?? "demo",
    files: {
      "problem.json": JSON.stringify({ ...baseProblem, ...over.problem }),
      "tests.json": JSON.stringify(over.tests ?? baseTests),
      "hints.json": JSON.stringify(over.hints ?? ["h1", "h2", "h3"]),
      "solutions/main.md":
        '---\ntitle: "Main"\n---\n\nA cache.\n\n## Trade-offs\n\n- fast\n- stale reads\n',
      "solutions/main.graph.json": JSON.stringify(goodGraph),
      ...over.files,
    },
  };
}

const errorsOf = (d: RawProblemDir) => validateContent([d]).errors.join("\n");

describe("validateContent", () => {
  it("accepts a valid folder and assembles the problem", () => {
    const { problems, errors } = validateContent([dir()]);
    expect(errors).toEqual([]);
    const [p] = problems;
    expect(p.hints).toHaveLength(3);
    expect(p.tests[4].kind).toBe("bonus");
    expect(p.references[0]).toMatchObject({
      id: "main",
      name: "Main",
      summary: "A cache.",
      tradeoffs: ["fast", "stale reads"],
    });
    expect(p.references[0].graph?.nodes).toHaveLength(2);
  });

  it("requires the folder name to match the id", () => {
    expect(errorsOf(dir({ name: "other" }))).toMatch(/must match the folder name/);
  });

  it("rejects unknown types and groups in tests, and unknown key components", () => {
    const e = errorsOf(
      dir({
        problem: { keyComponents: ["flux"] },
        tests: [...baseTests.slice(0, 5), test("t6", { hasNode: "@dbs" })],
      }),
    );
    expect(e).toMatch(/keyComponents: unknown type "flux"/);
    expect(e).toMatch(/unknown type "@dbs"/);
  });

  it("rejects malformed checks, bad regexes and the old format", () => {
    expect(
      errorsOf(dir({ tests: [...baseTests.slice(0, 5), test("t6", { hasNod: "cache" })] })),
    ).not.toBe("");
    expect(
      errorsOf(
        dir({ tests: [...baseTests.slice(0, 5), test("t6", { textMentions: { pattern: "(" } })] }),
      ),
    ).toMatch(/Invalid regular expression/);
    expect(
      errorsOf(dir({ tests: baseTests.map(({ title, ...t }) => ({ ...t, desc: title })) })),
    ).not.toBe("");
  });

  it("enforces 6–10 tests, at least 4 core, 3–4 hints and a fail hint on every test", () => {
    expect(errorsOf(dir({ tests: baseTests.slice(0, 5) }))).toMatch(/tests\.json/);
    expect(errorsOf(dir({ tests: baseTests.map((t) => ({ ...t, kind: "bonus" })) }))).toMatch(
      /at least 4 core/,
    );
    expect(errorsOf(dir({ hints: ["only one"] }))).toMatch(/hints\.json/);
    expect(errorsOf(dir({ tests: baseTests.map(({ failHint: _f, ...t }) => t) }))).toMatch(
      /failHint/,
    );
  });

  it("rejects unknown prerequisite concepts", () => {
    expect(errorsOf(dir({ problem: { prerequisites: ["quantum-caching"] } }))).toMatch(
      /unknown concept/,
    );
  });

  it("fails when a solution diagram misses a core test, but not a bonus one", () => {
    const noCache = { ...goodGraph, n: [goodGraph.n[0]], e: [] };
    expect(
      errorsOf(dir({ files: { "solutions/main.graph.json": JSON.stringify(noCache) } })),
    ).toMatch(/solution "main" fails core tests: t1, t3/);
    // t5 (bonus, needs "ttl" text) fails on the good graph, yet the folder is valid.
    expect(errorsOf(dir())).toBe("");
  });

  it("flags dangling edges, orphan graph files and bad frontmatter", () => {
    const dangling = { ...goodGraph, e: [{ i: "e1", s: "c", d: "nope" }] };
    expect(
      errorsOf(dir({ files: { "solutions/main.graph.json": JSON.stringify(dangling) } })),
    ).toMatch(/dangling/);
    expect(
      errorsOf(dir({ files: { "solutions/extra.graph.json": JSON.stringify(goodGraph) } })),
    ).toMatch(/without a matching \.md/);
    expect(errorsOf(dir({ files: { "solutions/main.md": "no frontmatter" } }))).toMatch(
      /frontmatter/,
    );
  });

  it("rejects duplicate ids and numbers across folders", () => {
    const e = validateContent([dir(), dir()]).errors.join("\n");
    expect(e).toMatch(/duplicate id/);
    expect(e).toMatch(/number 1 is also used/);
  });
});

describe("content/problems", () => {
  const { problems, errors } = validateContent(readProblemDirs());

  it("is valid, and every solution diagram passes its core tests", () => {
    expect(errors).toEqual([]);
  });

  it("has 30 problems: 6 easy, 14 medium, 10 hard", () => {
    expect(problems).toHaveLength(30);
    const count = (d: string) => problems.filter((p) => p.difficulty === d).length;
    expect([count("easy"), count("medium"), count("hard")]).toEqual([6, 14, 10]);
  });

  it("loads the 10 priority problems with diagrams for every approach", () => {
    const priority = problems.filter((p) => p.priority);
    expect(priority.map((p) => p.number)).toEqual([1, 3, 7, 8, 10, 13, 15, 21, 22, 23]);
    for (const p of priority)
      expect(
        p.references.every((r) => r.graph),
        p.id,
      ).toBe(true);
  });

  it("gives every problem prerequisites and at least one diagram", () => {
    for (const p of problems) {
      expect(p.prerequisites.length, p.id).toBeGreaterThan(0);
      expect(
        p.references.some((r) => r.graph),
        p.id,
      ).toBe(true);
    }
  });
});
