import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { RawProblemDir } from "@/lib/content/problemDir";
import type { Problem, ProblemSummary } from "@/lib/schema";
import { validateContent } from "./validate";

/** Server-only: content/problems/<id>/... Adding a problem means adding a folder. */
export const PROBLEMS_DIR = path.join(process.cwd(), "content", "problems");

function readTree(dir: string, base = ""): Record<string, string> {
  const files: Record<string, string> = {};
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (statSync(full).isDirectory()) Object.assign(files, readTree(full, rel));
    else files[rel] = readFileSync(full, "utf8");
  }
  return files;
}

export function readProblemDirs(root = PROBLEMS_DIR): RawProblemDir[] {
  return readdirSync(root)
    .filter((name) => statSync(path.join(root, name)).isDirectory())
    .sort()
    .map((dir) => ({ dir, files: readTree(path.join(root, dir)) }));
}

let cache: Problem[] | null = null;

export function loadProblems(): Problem[] {
  if (cache) return cache;
  const { problems, errors } = validateContent(readProblemDirs());
  if (errors.length) {
    throw new Error(`Invalid content (run pnpm validate:content):\n${errors.join("\n")}`);
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
