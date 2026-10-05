import { z } from "zod";
import { GraphSchema } from "./graph";

/** content/concepts/<slug>.md frontmatter (PHASE-2 §4). */
export const ConceptFrontmatterSchema = z.strictObject({
  title: z.string().min(1),
  tags: z.array(z.string().min(1)).default([]),
  /** Catalog types this card explains; the palette's "Learn" link uses it. */
  components: z.array(z.string().min(1)).default([]),
  related: z.array(z.string().min(1)).default([]),
});

/** The seven sections every card has, in this order. */
export const CONCEPT_SECTIONS = [
  "What it is",
  "When to use it",
  "How it works",
  "Trade-offs",
  "Interview one-liners",
  "Common follow-up questions",
  "Further reading",
] as const;

export const ConceptSchema = ConceptFrontmatterSchema.extend({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  /** One-line summary: the first paragraph of "What it is". */
  summary: z.string(),
  body: z.string(),
  graph: GraphSchema.optional(),
});
export type Concept = z.infer<typeof ConceptSchema>;
export type ConceptSummary = Pick<Concept, "slug" | "title" | "tags" | "summary">;
