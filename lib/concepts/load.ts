import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { validateConcepts, type RawConceptFiles } from "@/lib/content/conceptCards";
import type { Concept, ConceptSummary } from "@/lib/schema";

/** Server-only: content/concepts/<slug>.md (+ optional <slug>.graph.json). */
export const CONCEPTS_DIR = path.join(process.cwd(), "content", "concepts");

export function readConceptFiles(root = CONCEPTS_DIR): RawConceptFiles {
  return Object.fromEntries(
    readdirSync(root).map((f) => [f, readFileSync(path.join(root, f), "utf8")]),
  );
}

let cache: Concept[] | null = null;

export function loadConcepts(): Concept[] {
  if (cache) return cache;
  const { concepts, errors } = validateConcepts(readConceptFiles());
  if (errors.length) {
    throw new Error(`Invalid concepts (run pnpm validate:content):\n${errors.join("\n")}`);
  }
  cache = concepts;
  return concepts;
}

export function getConcept(slug: string): Concept | undefined {
  return loadConcepts().find((c) => c.slug === slug);
}

export function conceptSummaries(): ConceptSummary[] {
  return loadConcepts().map(({ slug, title, tags, summary }) => ({ slug, title, tags, summary }));
}
