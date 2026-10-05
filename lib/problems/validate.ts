import { CATALOG } from "@/lib/catalog/components";
import { isGroupOrWildcard } from "@/lib/catalog/groups";
import { CONCEPT_SLUGS } from "@/lib/content/concepts";
import { assembleProblem, type RawProblemDir } from "@/lib/content/problemDir";
import type { Check, Problem, TypeRefs } from "@/lib/schema";
import { runTests } from "@/lib/tests/engine";

export type ValidationResult = { problems: Problem[]; errors: string[] };

const list = (r: TypeRefs | undefined): string[] =>
  r === undefined ? [] : Array.isArray(r) ? r : [r];

/** Every node type / group a check names, so typos fail the build. */
function checkTypes(c: Check): string[] {
  if ("anyOf" in c) return c.anyOf.flatMap(checkTypes);
  if ("allOf" in c) return c.allOf.flatMap(checkTypes);
  if ("not" in c) return checkTypes(c.not);
  if ("hasNode" in c) return list(c.hasNode);
  if ("nodeConfig" in c) return list(c.nodeConfig.type);
  if ("pathExists" in c)
    return [...list(c.pathExists.from), ...list(c.pathExists.to), ...list(c.pathExists.via)];
  if ("edgeExists" in c) return [...list(c.edgeExists.from), ...list(c.edgeExists.to)];
  if ("upstreamOf" in c) return [...list(c.upstreamOf.target), ...list(c.upstreamOf.anyType)];
  return [];
}

const knownType = (t: string) => Boolean(CATALOG[t]) || isGroupOrWildcard(t);

function crossChecks(p: Problem, dir: string): string[] {
  const errors: string[] = [];
  const at = (msg: string) => errors.push(`${dir}: ${msg}`);

  if (p.id !== dir) at(`id "${p.id}" must match the folder name`);
  for (const t of p.keyComponents) if (!CATALOG[t]) at(`keyComponents: unknown type "${t}"`);
  for (const slug of p.prerequisites) {
    if (!(CONCEPT_SLUGS as readonly string[]).includes(slug))
      at(`prerequisites: unknown concept "${slug}"`);
  }

  const ids = new Set<string>();
  for (const t of p.tests) {
    if (ids.has(t.id)) at(`duplicate test id "${t.id}"`);
    ids.add(t.id);
    for (const type of checkTypes(t.check))
      if (!knownType(type)) at(`test "${t.id}": unknown type "${type}"`);
  }
  if (p.tests.filter((t) => t.kind === "core").length < 4) at("needs at least 4 core tests");

  for (const ref of p.references) {
    if (!ref.graph) continue;
    const nodeIds = new Set(ref.graph.nodes.map((n) => n.id));
    for (const n of ref.graph.nodes)
      if (!CATALOG[n.type]) at(`solution "${ref.id}": unknown type "${n.type}"`);
    for (const e of ref.graph.edges) {
      if (!nodeIds.has(e.source) || !nodeIds.has(e.target))
        at(`solution "${ref.id}": edge ${e.id} is dangling`);
    }
    for (const a of ref.apis)
      if (!nodeIds.has(a.ownerNodeId)) at(`solution "${ref.id}": API ${a.id} has no owner`);
    // Tests describe what a design achieves, so every reference solution must pass all core tests.
    const failed = runTests(p.tests, { graph: ref.graph, apis: ref.apis, entities: ref.entities })
      .filter((r) => r.core && !r.passed)
      .map((r) => r.id);
    if (failed.length) at(`solution "${ref.id}" fails core tests: ${failed.join(", ")}`);
  }
  return errors;
}

/** Validates every problem folder: schemas, cross-references, and solutions against their tests. */
export function validateContent(dirs: RawProblemDir[]): ValidationResult {
  const problems: Problem[] = [];
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const seenNumbers = new Map<number, string>();

  for (const raw of dirs) {
    const assembled = assembleProblem(raw);
    if (!assembled.ok) {
      errors.push(...assembled.errors);
      continue;
    }
    const p = assembled.value;
    if (seenIds.has(p.id)) errors.push(`${raw.dir}: duplicate id "${p.id}"`);
    const clash = seenNumbers.get(p.number);
    if (clash) errors.push(`${raw.dir}: number ${p.number} is also used by ${clash}`);
    seenIds.add(p.id);
    seenNumbers.set(p.number, raw.dir);
    errors.push(...crossChecks(p, raw.dir));
    problems.push(p);
  }
  problems.sort((a, b) => a.number - b.number);
  return { problems, errors };
}
