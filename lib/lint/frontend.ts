import type { LintIssue } from "@/lib/schema";
import type { LintContext } from "./rules";

/** Browser edges describe dependencies/calls, so server capacity/queue rules do not apply. */
export function frontendLint(ctx: LintContext): LintIssue[] {
  const issues: LintIssue[] = [];
  const { nodes, edges } = ctx.graph;
  for (const node of nodes) {
    if (["note", "group"].includes(node.type)) continue;
    const add = (rule: string, message: string, fix: string) =>
      issues.push({
        id: `${rule}:${node.id}`,
        rule,
        severity: "info",
        message,
        fix,
        nodeIds: [node.id],
        edgeIds: [],
      });
    if (nodes.length > 1 && !edges.some((e) => e.source === node.id || e.target === node.id))
      add(
        "frontend-disconnected",
        `${node.data.label} has no data-flow connection.`,
        "Connect it to the component that calls or reads it.",
      );
    if (node.type === "ui_component" && !node.data.config.accessibility)
      add(
        "frontend-accessibility",
        `${node.data.label}: document keyboard and focus behavior.`,
        "Add semantics, focus transitions and loading/error announcements in the inspector.",
      );
    if (node.type === "api_client" && !node.data.config.cancellation)
      add(
        "frontend-stale-response",
        `${node.data.label}: how are obsolete responses handled?`,
        "Explain request identity, abort and cleanup on unmount or query changes.",
      );
    if (node.type === "client_store" && !node.data.config.scope)
      add(
        "frontend-state-scope",
        `${node.data.label}: define who owns this state.`,
        "Keep ephemeral state local; distinguish URL and server state from shared client state.",
      );
  }
  return issues;
}
