import { z } from "zod";

export const LintSeveritySchema = z.enum(["error", "warn", "info"]);
export type LintSeverity = z.infer<typeof LintSeveritySchema>;

export const LintIssueSchema = z.object({
  /** Stable per rule + subject, usable as a React key. */
  id: z.string(),
  rule: z.string(),
  severity: LintSeveritySchema,
  message: z.string(),
  /** How to fix it. */
  fix: z.string().optional(),
  nodeIds: z.array(z.string()).default([]),
  edgeIds: z.array(z.string()).default([]),
});
export type LintIssue = z.infer<typeof LintIssueSchema>;
