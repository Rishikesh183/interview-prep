import { z } from "zod";

const text = z.string().trim().min(1);
const ids = z.array(text).default([]);

export const BuildStepSchema = z.object({
  title: text,
  explanation: text,
  nodeIds: ids,
  edgeIds: ids,
  apiIds: ids,
  entityNames: ids,
});

export const WalkthroughSchema = z.object({
  version: z.literal(1),
  overview: text,
  limitations: z.array(text).default([]),
  estimation: z
    .array(z.object({ assumption: text, calculation: text, result: text, implication: text }))
    .min(1),
  components: z.array(z.object({ nodeId: text, purpose: text, rationale: text })).min(1),
  entityDetails: z.array(
    z.object({
      entityName: text,
      purpose: text,
      accessPatterns: z.array(text).min(1),
      constraints: z.array(text).min(1),
      relationships: z.array(text).default([]),
    }),
  ),
  apiDetails: z.array(z.object({ apiId: text, purpose: text, rationale: text })),
  buildSteps: z.array(BuildStepSchema).min(1),
  flows: z
    .array(
      z.object({
        id: text,
        title: text,
        apiId: text.optional(),
        steps: z
          .array(z.object({ title: text, explanation: text, nodeIds: ids, edgeIds: ids }))
          .min(1),
      }),
    )
    .min(1),
  failureCases: z.array(z.object({ scenario: text, handling: text, nodeIds: ids })).min(1),
  alternatives: text,
  sectionApplicability: z.object({ apis: text.optional(), entities: text.optional() }).default({}),
});
export type Walkthrough = z.infer<typeof WalkthroughSchema>;
export type BuildStep = z.infer<typeof BuildStepSchema>;
