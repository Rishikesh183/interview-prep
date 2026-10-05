import { readProblemFiles } from "@/lib/problems/load";
import { validateProblems } from "@/lib/problems/validate";

const { problems, errors } = validateProblems(readProblemFiles());

if (errors.length) {
  console.error(`✗ ${errors.length} problem error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const tests = problems.reduce((n, p) => n + p.tests.length, 0);
const refs = problems.reduce((n, p) => n + p.references.filter((r) => r.graph).length, 0);
console.log(
  `✓ ${problems.length} problems, ${tests} test cases, ${refs} reference graphs passing their tests.`,
);
