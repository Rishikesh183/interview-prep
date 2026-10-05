import { z } from "zod";
import { ApiEndpointSchema, HttpMethodSchema, PaginationSchema } from "./api";
import { EdgeModeSchema, EdgeOpSchema, GraphSchema, ProtocolSchema } from "./graph";

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

/** A node type, a type alias (client, db, queue...), or "*" — alone or as a list. */
const TypeListSchema = z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]);
export type TypeList = z.infer<typeof TypeListSchema>;

const ScalarSchema = z.union([z.string(), z.number(), z.boolean()]);
const oneOrMany = <T extends z.ZodType>(s: T) => z.union([s, z.array(s).min(1)]);

// ---- Test-case checks: "does the design achieve X?", not "does it have exactly this box?" ----

const HasNodeSchema = z.strictObject({
  hasNode: TypeListSchema,
  min: z.number().int().positive().optional(),
});

const NodeConfigSchema = z.strictObject({
  nodeConfig: z.strictObject({
    type: TypeListSchema,
    /** Each key must equal the value (or one of the listed values). */
    config: z.record(z.string(), oneOrMany(ScalarSchema)).optional(),
    /** Matched against label + note + config values. */
    "text~": RegexSchema.optional(),
  }),
});

const EdgeMatchSchema = z.strictObject({
  edgeMatch: z.strictObject({
    from: TypeListSchema.optional(),
    to: TypeListSchema.optional(),
    mode: EdgeModeSchema.optional(),
    protocol: oneOrMany(ProtocolSchema).optional(),
    op: oneOrMany(EdgeOpSchema).optional(),
    /** Matched against edge label + note. */
    "text~": RegexSchema.optional(),
  }),
});

const PathExistsSchema = z.strictObject({
  pathExists: z.strictObject({
    from: TypeListSchema,
    /** Every entry must be reachable from the same start node as `to`. */
    via: z.array(TypeListSchema).optional(),
    to: TypeListSchema,
  }),
});

const UpstreamOfSchema = z.strictObject({
  /** Every node of this type has an ancestor of one of `anyType`. */
  upstreamOf: TypeListSchema,
  anyType: TypeListSchema,
});

const ApiMatchSchema = z.strictObject({
  apiMatch: z.strictObject({
    method: oneOrMany(HttpMethodSchema).optional(),
    "path~": RegexSchema.optional(),
    auth: z.boolean().optional(),
    idempotent: z.boolean().optional(),
    pagination: oneOrMany(PaginationSchema).optional(),
    rateLimited: z.boolean().optional(),
  }),
});

const EntityMatchSchema = z.strictObject({
  entityMatch: z.strictObject({
    "name~": RegexSchema.optional(),
    "fields~": RegexSchema.optional(),
  }),
});

/** Free-text search over every note, label, edge label, entity and API path in the design. */
const MentionsSchema = z.strictObject({ mentions: RegexSchema });

const LeafCheckSchema = z.union([
  HasNodeSchema,
  NodeConfigSchema,
  EdgeMatchSchema,
  PathExistsSchema,
  UpstreamOfSchema,
  ApiMatchSchema,
  EntityMatchSchema,
  MentionsSchema,
]);
type LeafCheck = z.infer<typeof LeafCheckSchema>;

export type TestCheck =
  LeafCheck | { anyOf: TestCheck[] } | { allOf: TestCheck[] } | { not: TestCheck };

export const TestCheckSchema: z.ZodType<TestCheck> = z.lazy(() =>
  z.union([
    LeafCheckSchema,
    z.strictObject({ anyOf: z.array(TestCheckSchema).min(1) }),
    z.strictObject({ allOf: z.array(TestCheckSchema).min(1) }),
    z.strictObject({ not: TestCheckSchema }),
  ]),
);

export const TestCaseSchema = z.strictObject({
  id: z.string().min(1),
  desc: z.string().min(1),
  /** Shown when the test fails (optional, can be hidden in "no hints" mode). */
  hint: z.string().optional(),
  check: TestCheckSchema,
});
export type TestCase = z.infer<typeof TestCaseSchema>;

// ---- Problem ----

export const EntitySchema = z.object({
  name: z.string(),
  fields: z.string(),
  storeNodeId: z.string().optional(),
});
export type Entity = z.infer<typeof EntitySchema>;

export const ReferenceApproachSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  tradeoffs: z.array(z.string()).default([]),
  graph: GraphSchema.optional(),
  apis: z.array(ApiEndpointSchema).default([]),
  entities: z.array(EntitySchema).default([]),
});
export type ReferenceApproach = z.infer<typeof ReferenceApproachSchema>;

export const ProblemSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  number: z.number().int().positive(),
  title: z.string().min(1),
  difficulty: DifficultySchema,
  /** "Do these first": the most common interview questions. */
  priority: z.boolean().default(false),
  tags: z.array(z.string()),
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
  /** Revealed one at a time. */
  hints: z.array(z.string()),
  /** Node types a good design likely uses. */
  keyComponents: z.array(z.string()),
  deepDives: z.array(z.string()),
  rubricFocus: z.array(z.string()),
  tests: z.array(TestCaseSchema).min(1),
  references: z.array(ReferenceApproachSchema).default([]),
});
export type Problem = z.infer<typeof ProblemSchema>;
export type ProblemInput = z.input<typeof ProblemSchema>;

export type ProblemSummary = Pick<
  Problem,
  "id" | "number" | "title" | "difficulty" | "priority" | "tags"
> & { testCount: number };
