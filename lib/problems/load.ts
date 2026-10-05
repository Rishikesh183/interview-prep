import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Problem, ProblemSummary } from "@/lib/schema";
import { validateProblems, type ProblemFile } from "./validate";

/** Server-only: reads content/problems/*.json. Adding a problem means dropping in a file. */
export const PROBLEMS_DIR = path.join(process.cwd(), "content", "problems");

export function readProblemFiles(dir = PROBLEMS_DIR): ProblemFile[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => ({ file, json: JSON.parse(readFileSync(path.join(dir, file), "utf8")) }));
}

let cache: Problem[] | null = null;

export function loadProblems(): Problem[] {
  if (cache) return cache;
  const { problems, errors } = validateProblems(readProblemFiles());
  if (errors.length) {
    throw new Error(`Invalid problem files (run pnpm validate:problems):\n${errors.join("\n")}`);
  }
  cache = problems;
  return problems;
}

export function getProblem(id: string): Problem | undefined {
  return loadProblems().find((p) => p.id === id);
}

export function problemSummaries(): ProblemSummary[] {
  return loadProblems().map((p) => ({
    id: p.id,
    number: p.number,
    title: p.title,
    difficulty: p.difficulty,
    priority: p.priority,
    tags: p.tags,
    testCount: p.tests.length,
  }));
}
