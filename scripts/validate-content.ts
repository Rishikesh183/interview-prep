import { readConceptFiles } from "@/lib/concepts/load";
import { validateConcepts } from "@/lib/content/conceptCards";
import { readProblemDirs } from "@/lib/problems/load";
import { validateContent } from "@/lib/problems/validate";

const { problems, errors } = validateContent(readProblemDirs());
const cards = validateConcepts(readConceptFiles());
errors.push(...cards.errors);

if (errors.length) {
  console.error(`✗ ${errors.length} content error(s):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

const tests = problems.flatMap((p) => p.tests);
const core = tests.filter((t) => t.kind === "core").length;
const solutions = problems.flatMap((p) => p.references);
const diagrams = solutions.filter((s) => s.graph).length;
console.log(
  `✓ ${problems.length} problems, ${tests.length} tests (${core} core), ` +
    `${solutions.length} solutions (${diagrams} with diagrams) — every diagram passes its core tests.`,
);
console.log(
  `✓ ${cards.concepts.length} concept cards (${cards.concepts.filter((c) => c.graph).length} with diagrams) cover every catalog component.`,
);
