import matter from "gray-matter";
import type { z } from "zod";
import { fromStored } from "@/lib/graph/codec";
import {
  HintsFileSchema,
  ProblemFileSchema,
  SolutionFrontmatterSchema,
  SolutionGraphFileSchema,
  TestsFileSchema,
  type Problem,
  type ReferenceApproach,
} from "@/lib/schema";

/** One problem folder as raw text: path relative to the folder → file contents. */
export type RawProblemDir = { dir: string; files: Record<string, string> };

export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function parseJson<S extends z.ZodType>(
  raw: RawProblemDir,
  file: string,
  schema: S,
): Parsed<z.infer<S>> {
  const text = raw.files[file];
  if (text === undefined) return { ok: false, errors: [`${raw.dir}/${file}: missing`] };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    return { ok: false, errors: [`${raw.dir}/${file}: invalid JSON (${(err as Error).message})`] };
  }
  const res = schema.safeParse(json);
  if (res.success) return { ok: true, value: res.data };
  return {
    ok: false,
    errors: res.error.issues
      .slice(0, 5)
      .map((i) => `${raw.dir}/${file}: ${i.path.join(".") || "(root)"}: ${i.message}`),
  };
}

/** Summary = the text before the first "## " heading; trade-offs = bullets under "## Trade-offs". */
function readSolutionBody(body: string): { summary: string; tradeoffs: string[] } {
  const summary = body.split(/^## /m)[0].trim();
  const section = body.match(/^## Trade-offs\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1] ?? "";
  const tradeoffs = section
    .split("\n")
    .map((l) => l.match(/^\s*[-*]\s+(.*)$/)?.[1]?.trim())
    .filter((l): l is string => Boolean(l));
  return { summary, tradeoffs };
}

function parseSolutions(raw: RawProblemDir): Parsed<ReferenceApproach[]> {
  const errors: string[] = [];
  const out: (ReferenceApproach & { order: number })[] = [];
  const mdFiles = Object.keys(raw.files).filter((f) => /^solutions\/[a-z0-9-]+\.md$/.test(f));

  for (const file of mdFiles) {
    const slug = file.slice("solutions/".length, -".md".length);
    const { data, content } = matter(raw.files[file]);
    const fm = SolutionFrontmatterSchema.safeParse(data);
    if (!fm.success) {
      errors.push(`${raw.dir}/${file}: frontmatter: ${fm.error.issues[0]?.message}`);
      continue;
    }
    const { summary, tradeoffs } = readSolutionBody(content);
    if (!summary)
      errors.push(`${raw.dir}/${file}: needs a summary paragraph before the first heading`);

    const graphFile = `solutions/${slug}.graph.json`;
    let diagram: Pick<ReferenceApproach, "graph" | "apis" | "entities"> = {
      apis: [],
      entities: [],
    };
    if (graphFile in raw.files) {
      const g = parseJson(raw, graphFile, SolutionGraphFileSchema);
      if (!g.ok) {
        errors.push(...g.errors);
        continue;
      }
      const { apis, entities, ...stored } = g.value;
      diagram = { graph: fromStored(stored), apis, entities };
    }
    out.push({
      id: slug,
      name: fm.data.title,
      summary,
      tradeoffs,
      body: content.trim(),
      order: fm.data.order,
      ...diagram,
    });
  }

  const orphans = Object.keys(raw.files).filter(
    (f) => f.endsWith(".graph.json") && !(f.replace(/\.graph\.json$/, ".md") in raw.files),
  );
  errors.push(...orphans.map((f) => `${raw.dir}/${f}: graph without a matching .md`));
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: out.sort((a, b) => a.order - b.order).map(({ order: _o, ...r }) => r),
  };
}

/** Parses and assembles one folder into the app's Problem shape (no cross-file checks). */
export function assembleProblem(raw: RawProblemDir): Parsed<Problem> {
  const problem = parseJson(raw, "problem.json", ProblemFileSchema);
  const tests = parseJson(raw, "tests.json", TestsFileSchema);
  const hints = parseJson(raw, "hints.json", HintsFileSchema);
  const solutions = parseSolutions(raw);
  const errors = [problem, tests, hints, solutions].flatMap((p) => (p.ok ? [] : p.errors));
  if (!problem.ok || !tests.ok || !hints.ok || !solutions.ok) return { ok: false, errors };
  return {
    ok: true,
    value: {
      ...problem.value,
      hints: hints.value,
      tests: tests.value,
      references: solutions.value,
    },
  };
}
