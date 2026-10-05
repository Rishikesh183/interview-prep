import { z } from "zod";
import { ApiEndpointSchema, HttpMethodSchema, PaginationSchema } from "./api";
import { EstimationInputSchema, EstimationOutputSchema } from "./estimation";
import { EdgeModeSchema, GraphSchema } from "./graph";
import { StoredGraphSchema } from "./stored";

export const DifficultySchema = z.enum(["easy", "medium", "hard"]);
export type Difficulty = z.infer<typeof DifficultySchema>;

/** Case-insensitive regex source, validated at parse time. */
const RegexSchema = z.string().refine(
  (s) => {
    try {
      new RegExp(s, "i");
      return true;
    } catch {
      return false;
    }
  },
  { message: "Invalid regular expression" },
);

/** A catalog type, a group ("@database", "@queue"...) or "*", alone or as a list. */
const TypeRefsSchema = z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]);
export type TypeRefs = z.infer<typeof TypeRefsSchema>;

const oneOrMany = <T extends z.ZodType>(s: T) => z.union([s, z.array(s).min(1)]);

export const TextSourceSchema = z.enum(["notes", "labels", "requirements", "apis", "entities"]);
export type TextSource = z.infer<typeof TextSourceSchema>;

export const EstimationFieldSchema = z.enum([
  ...(EstimationInputSchema.keyof().options as [string, ...string[]]),
  ...(EstimationOutputSchema.keyof().options as [string, ...string[]]),
]);

// ---- Checks (PHASE-2 §2): properties of the design, so any valid architecture passes ----

const LeafCheckSchema = z.union([
  /** Any of these types present (count ≥ min). */
  z.strictObject({ hasNode: TypeRefsSchema, min: z.number().int().positive().optional() }),
  /** Some node of `type` whose config matches every `where` entry (strings are regexes). */
  z.strictObject({
    nodeConfig: z.strictObject({
      type: TypeRefsSchema,
      where: z.record(z.string(), z.union([RegexSchema, z.number(), z.boolean()])),
    }),
  }),
  /**
   * A route from `from` to `to` following edges (caller → callee). With `via`, a node of those
   * types must be on the route or called by a node on it (so cache-aside counts). `mode`
   * restricts the edges walked.
   */
  z.strictObject({
    pathExists: z.strictObject({
      from: TypeRefsSchema,
      to: TypeRefsSchema,
      via: TypeRefsSchema.optional(),
      mode: EdgeModeSchema.optional(),
    }),
  }),
  /** A direct edge. */
  z.strictObject({
    edgeExists: z.strictObject({
      from: TypeRefsSchema,
      to: TypeRefsSchema,
      mode: EdgeModeSchema.optional(),
    }),
  }),
  /** Every `target` node has a direct inbound edge from one of `anyType` (and there is one). */
  z.strictObject({
    upstreamOf: z.strictObject({ target: TypeRefsSchema, anyType: TypeRefsSchema }),
  }),
  /** An API whose path matches the regex (plus optional method / flags). */
  z.strictObject({
    apiMatch: z.strictObject({
      method: oneOrMany(HttpMethodSchema).optional(),
      path: RegexSchema,
      idempotent: z.boolean().optional(),
      auth: z.boolean().optional(),
      rateLimited: z.boolean().optional(),
      pagination: oneOrMany(PaginationSchema).optional(),
    }),
  }),
  /** Regex over the user's written text: lets a valid alternative pass when it's explained. */
  z.strictObject({
    textMentions: z.strictObject({
      pattern: RegexSchema,
      in: z.array(TextSourceSchema).min(1).optional(),
    }),
  }),
  z.strictObject({
    estimation: z.strictObject({
      field: EstimationFieldSchema,
      min: z.number().optional(),
      max: z.number().optional(),
    }),
  }),
]);
type LeafCheck = z.infer<typeof LeafCheckSchema>;

export type Check = LeafCheck | { anyOf: Check[] } | { allOf: Check[] } | { not: Check };

export const CheckSchema: z.ZodType<Check> = z.lazy(() =>
  z.union([
    LeafCheckSchema,
    z.strictObject({ anyOf: z.array(CheckSchema).min(1) }),
    z.strictObject({ allOf: z.array(CheckSchema).min(1) }),
    z.strictObject({ not: CheckSchema }),
  ]),
);

export const TestKindSchema = z.enum(["core", "bonus"]);

export const TestCaseSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Shown to the user, e.g. "Short codes are unique". */
  title: z.string().min(1),
  /** Bonus tests don't count towards "solved". */
  kind: TestKindSchema.default("core"),
  weight: z.number().positive().default(1),
  check: CheckSchema,
  /** A nudge, never the answer. */
  failHint: z.string().min(1),
});
export type TestCase = z.infer<typeof TestCaseSchema>;

// ---- Content files (content/problems/<id>/...) ----

export const EntitySchema = z.object({
  name: z.string(),
  fields: z.string(),
  storeNodeId: z.string().optional(),
});
export type Entity = z.infer<typeof EntitySchema>;

/** problem.json */
export const ProblemFileSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  number: z.number().int().positive(),
  title: z.string().min(1),
  difficulty: DifficultySchema,
  /** "Do these first": the most common interview questions. */
  priority: z.boolean().default(false),
  tags: z.array(z.string()).min(1),
  prompt: z.string().min(1),
  /** Hidden until the attempt is submitted. */
  functionalReqs: z.array(z.string()).min(1),
  nonFunctionalReqs: z.array(z.string()).min(1),
  scale: z.strictObject({
    dau: z.string().optional(),
    qps: z.string().optional(),
    storage: z.string().optional(),
    notes: z.string().optional(),
  }),
  outOfScope: z.array(z.string()).default([]),
  /** Node types a good design likely uses. */
  keyComponents: z.array(z.string()),
  deepDives: z.array(z.string()).min(1),
  rubricFocus: z.array(z.string()),
  /** Concept card slugs to study first. */
  prerequisites: z.array(z.string()).default([]),
});

/** tests.json */
export const TestsFileSchema = z.array(TestCaseSchema).min(6).max(10);
/** hints.json, in reveal order */
export const HintsFileSchema = z.array(z.string().min(1)).min(3).max(4);

/** solutions/<slug>.graph.json */
export const SolutionGraphFileSchema = StoredGraphSchema.extend({
  apis: z.array(ApiEndpointSchema).default([]),
  entities: z.array(EntitySchema).default([]),
});

/** solutions/<slug>.md frontmatter */
export const SolutionFrontmatterSchema = z.strictObject({
  title: z.string().min(1),
  order: z.number().int().default(1),
});

// ---- Assembled problem (what the app uses) ----

export const ReferenceApproachSchema = z.object({
  /** Solution slug. */
  id: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  tradeoffs: z.array(z.string()).default([]),
  /** Full markdown body of the solution file. */
  body: z.string().default(""),
  graph: GraphSchema.optional(),
  apis: z.array(ApiEndpointSchema).default([]),
  entities: z.array(EntitySchema).default([]),
});
export type ReferenceApproach = z.infer<typeof ReferenceApproachSchema>;

export const ProblemSchema = ProblemFileSchema.extend({
  hints: HintsFileSchema,
  tests: TestsFileSchema,
  references: z.array(ReferenceApproachSchema).default([]),
});
export type Problem = z.infer<typeof ProblemSchema>;

export type ProblemSummary = Pick<
  Problem,
  "id" | "number" | "title" | "difficulty" | "priority" | "tags"
> & { testCount: number };
