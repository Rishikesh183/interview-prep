import { describe, expect, it } from "vitest";
import { readProblemFiles } from "./load";
import { validateProblems } from "./validate";

const minimal = {
  id: "demo",
  number: 1,
  title: "Demo",
  difficulty: "easy",
  tags: [],
  prompt: "Design it.",
  functionalReqs: ["a"],
  nonFunctionalReqs: ["b"],
  scale: {},
  hints: [],
  keyComponents: ["cache"],
  deepDives: [],
  rubricFocus: [],
  tests: [{ id: "t1", desc: "has cache", check: { hasNode: "cache" } }],
};

describe("validateProblems", () => {
  it("accepts a minimal problem", () => {
    const res = validateProblems([{ file: "demo.json", json: minimal }]);
    expect(res.errors).toEqual([]);
    expect(res.problems[0].priority).toBe(false);
  });

  it("requires the id to match the file name", () => {
    const res = validateProblems([{ file: "other.json", json: minimal }]);
    expect(res.errors[0]).toMatch(/must match the file name/);
  });

  it("rejects unknown node types in tests and keyComponents", () => {
    const json = {
      ...minimal,
      keyComponents: ["flux_capacitor"],
      tests: [{ id: "t1", desc: "x", check: { anyOf: [{ hasNode: "cachee" }] } }],
    };
    const res = validateProblems([{ file: "demo.json", json }]);
    expect(res.errors.join("\n")).toMatch(/flux_capacitor/);
    expect(res.errors.join("\n")).toMatch(/cachee/);
  });

  it("rejects malformed checks", () => {
    const json = { ...minimal, tests: [{ id: "t1", desc: "x", check: { hasNod: "cache" } }] };
    expect(validateProblems([{ file: "demo.json", json }]).errors).not.toEqual([]);
  });

  it("fails when a reference approach does not pass the tests", () => {
    const json = {
      ...minimal,
      references: [
        {
          id: "r1",
          name: "No cache",
          summary: "x",
          graph: {
            nodes: [
              {
                id: "s",
                type: "service",
                position: { x: 0, y: 0 },
                data: { label: "s", config: {} },
              },
            ],
            edges: [],
          },
        },
      ],
    };
    const res = validateProblems([{ file: "demo.json", json }]);
    expect(res.errors.join("\n")).toMatch(/reference "r1" fails tests: t1/);
  });

  it("rejects duplicate ids and numbers", () => {
    const res = validateProblems([
      { file: "demo.json", json: minimal },
      { file: "demo.json", json: minimal },
    ]);
    expect(res.errors.join("\n")).toMatch(/duplicate id/);
    expect(res.errors.join("\n")).toMatch(/duplicate number/);
  });
});

describe("content/problems", () => {
  const { problems, errors } = validateProblems(readProblemFiles());

  it("are all valid, and every reference graph passes its problem's tests", () => {
    expect(errors).toEqual([]);
  });

  it("number 30 problems: 6 easy, 14 medium, 10 hard", () => {
    expect(problems).toHaveLength(30);
    const count = (d: string) => problems.filter((p) => p.difficulty === d).length;
    expect([count("easy"), count("medium"), count("hard")]).toEqual([6, 14, 10]);
  });

  it("give every problem 6+ tests and 2+ reference approaches", () => {
    for (const p of problems) {
      expect(p.tests.length, p.id).toBeGreaterThanOrEqual(6);
      expect(p.references.length, p.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("give every problem at least one reference diagram to compare against", () => {
    for (const p of problems)
      expect(
        p.references.some((r) => r.graph),
        p.id,
      ).toBe(true);
  });

  it("give the 10 priority problems reference graphs", () => {
    const priority = problems.filter((p) => p.priority);
    expect(priority.map((p) => p.number)).toEqual([1, 3, 7, 8, 10, 13, 15, 21, 22, 23]);
    for (const p of priority)
      expect(
        p.references.every((r) => r.graph),
        p.id,
      ).toBe(true);
  });
});
