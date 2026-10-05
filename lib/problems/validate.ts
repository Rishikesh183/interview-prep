import { CATALOG } from "@/lib/catalog/components";
import { ProblemSchema, type Problem, type TestCheck, type TypeList } from "@/lib/schema";
import { aliasNames } from "@/lib/tests/aliases";
import { runTests } from "@/lib/tests/engine";

export type ProblemFile = { file: string; json: unknown };
export type ValidationResult = { problems: Problem[]; errors: string[] };

const KNOWN_TYPES = new Set([...Object.keys(CATALOG), ...aliasNames()]);

function typeRefs(list: TypeList | undefined): string[] {
  if (list === undefined) return [];
  return Array.isArray(list) ? list : [list];
}

/** Every node type a check refers to, so typos are caught at build time. */
function checkTypes(check: TestCheck): string[] {
  if ("anyOf" in check) return check.anyOf.flatMap(checkTypes);
  if ("allOf" in check) return check.allOf.flatMap(checkTypes);
  if ("not" in check) return checkTypes(check.not);
  if ("hasNode" in check) return typeRefs(check.hasNode);
  if ("nodeConfig" in check) return typeRefs(check.nodeConfig.type);
  if ("edgeMatch" in check)
    return [...typeRefs(check.edgeMatch.from), ...typeRefs(check.edgeMatch.to)];
  if ("pathExists" in check) {
    const p = check.pathExists;
    return [...typeRefs(p.from), ...typeRefs(p.to), ...(p.via ?? []).flatMap(typeRefs)];
  }
  if ("upstreamOf" in check) return [...typeRefs(check.upstreamOf), ...typeRefs(check.anyType)];
  return [];
}

function validateOne(problem: Problem, file: string): string[] {
  const errors: string[] = [];
  const at = (msg: string) => errors.push(`${file}: ${msg}`);

  if (`${problem.id}.json` !== file) at(`id "${problem.id}" must match the file name`);

  for (const type of problem.keyComponents) {
    if (!CATALOG[type]) at(`keyComponents: unknown node type "${type}"`);
  }

  const testIds = new Set<string>();
  for (const test of problem.tests) {
    if (testIds.has(test.id)) at(`duplicate test id "${test.id}"`);
    testIds.add(test.id);
    for (const type of checkTypes(test.check)) {
      if (!KNOWN_TYPES.has(type)) at(`test "${test.id}": unknown node type "${type}"`);
    }
  }

  for (const ref of problem.references) {
    if (!ref.graph) continue;
    const ids = new Set(ref.graph.nodes.map((n) => n.id));
    for (const n of ref.graph.nodes) {
      if (!CATALOG[n.type]) at(`reference "${ref.id}": unknown node type "${n.type}"`);
    }
    for (const e of ref.graph.edges) {
      if (!ids.has(e.source) || !ids.has(e.target)) {
        at(`reference "${ref.id}": edge ${e.id} points at a missing node`);
      }
    }
    for (const a of ref.apis) {
      if (!ids.has(a.ownerNodeId)) at(`reference "${ref.id}": API ${a.id} has a missing owner`);
    }
    // Tests describe what a design achieves, so every reference approach must pass all of them.
    const failed = runTests(problem.tests, {
      graph: ref.graph,
      apis: ref.apis,
      entities: ref.entities,
    }).filter((r) => !r.passed);
    if (failed.length) {
      at(`reference "${ref.id}" fails tests: ${failed.map((r) => r.id).join(", ")}`);
    }
  }
  return errors;
}

export function validateProblems(files: ProblemFile[]): ValidationResult {
  const problems: Problem[] = [];
  const errors: string[] = [];
  const seenIds = new Map<string, string>();
  const seenNumbers = new Map<number, string>();

  for (const { file, json } of files) {
    const parsed = ProblemSchema.safeParse(json);
    if (!parsed.success) {
      for (const issue of parsed.error.issues.slice(0, 5)) {
        errors.push(`${file}: ${issue.path.join(".") || "(root)"}: ${issue.message}`);
      }
      continue;
    }
    const p = parsed.data;
    if (seenIds.has(p.id))
      errors.push(`${file}: duplicate id "${p.id}" (also in ${seenIds.get(p.id)})`);
    if (seenNumbers.has(p.number)) {
      errors.push(`${file}: duplicate number ${p.number} (also in ${seenNumbers.get(p.number)})`);
    }
    seenIds.set(p.id, file);
    seenNumbers.set(p.number, file);
    errors.push(...validateOne(p, file));
    problems.push(p);
  }

  problems.sort((a, b) => a.number - b.number);
  return { problems, errors };
}
