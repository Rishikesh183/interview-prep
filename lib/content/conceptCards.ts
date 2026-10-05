import matter from "gray-matter";
import { CATALOG } from "@/lib/catalog/components";
import { fromStored } from "@/lib/graph/codec";
import {
  CONCEPT_SECTIONS,
  ConceptFrontmatterSchema,
  StoredGraphSchema,
  type Concept,
} from "@/lib/schema";
import { CONCEPT_SLUGS } from "./concepts";

/** content/concepts as raw text: file name → contents. */
export type RawConceptFiles = Record<string, string>;

export type ConceptValidation = { concepts: Concept[]; errors: string[] };

const SLUGS = CONCEPT_SLUGS as readonly string[];

/** Parses and cross-checks every card: schema, sections, links, catalog coverage. */
export function validateConcepts(files: RawConceptFiles): ConceptValidation {
  const concepts: Concept[] = [];
  const errors: string[] = [];

  for (const file of Object.keys(files).sort()) {
    const md = file.match(/^([a-z0-9-]+)\.md$/);
    const gj = file.match(/^([a-z0-9-]+)\.graph\.json$/);
    if (gj) {
      if (!(`${gj[1]}.md` in files)) errors.push(`concepts/${file}: graph without a matching .md`);
      continue;
    }
    if (!md) {
      errors.push(`concepts/${file}: unexpected file`);
      continue;
    }
    const slug = md[1];
    const at = (msg: string) => errors.push(`concepts/${file}: ${msg}`);
    if (!SLUGS.includes(slug)) at(`"${slug}" is not in CONCEPT_SLUGS`);

    const { data, content } = matter(files[file]);
    const fm = ConceptFrontmatterSchema.safeParse(data);
    if (!fm.success) {
      at(`frontmatter: ${fm.error.issues[0]?.path.join(".")}: ${fm.error.issues[0]?.message}`);
      continue;
    }
    const headings = [...content.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
    if (headings.join("|") !== CONCEPT_SECTIONS.join("|"))
      at(`sections must be exactly: ${CONCEPT_SECTIONS.join(", ")}`);
    for (const t of fm.data.components) if (!CATALOG[t]) at(`components: unknown type "${t}"`);
    for (const r of fm.data.related) {
      if (!SLUGS.includes(r)) at(`related: unknown concept "${r}"`);
      if (r === slug) at("related: links to itself");
    }

    let graph: Concept["graph"];
    const graphText = files[`${slug}.graph.json`];
    if (graphText !== undefined) {
      try {
        const stored = StoredGraphSchema.safeParse(JSON.parse(graphText));
        if (!stored.success) at(`graph: ${stored.error.issues[0]?.message}`);
        else {
          graph = fromStored(stored.data);
          for (const n of graph.nodes) if (!CATALOG[n.type]) at(`graph: unknown type "${n.type}"`);
        }
      } catch (err) {
        at(`graph: invalid JSON (${(err as Error).message})`);
      }
    }

    const what = content.match(/^## What it is\s*\n+([\s\S]*?)(?:\n\n|\n## )/m)?.[1] ?? "";
    concepts.push({
      slug,
      ...fm.data,
      summary: what.trim(),
      body: content.trim(),
      graph,
    });
  }

  const have = new Set(concepts.map((c) => c.slug));
  for (const s of SLUGS) if (!have.has(s)) errors.push(`concepts: missing card "${s}.md"`);
  // Every palette item gets a "Learn" link, so every catalog type must be explained somewhere.
  const covered = new Set(concepts.flatMap((c) => c.components));
  for (const t of Object.keys(CATALOG))
    if (!covered.has(t)) errors.push(`concepts: no card lists component "${t}"`);

  concepts.sort((a, b) => SLUGS.indexOf(a.slug) - SLUGS.indexOf(b.slug));
  return { concepts, errors };
}

/** The card a palette item's "Learn" link opens: the first (in card order) that lists the type. */
export function conceptForComponent(concepts: Concept[], type: string): Concept | undefined {
  return concepts.find((c) => c.components.includes(type));
}
