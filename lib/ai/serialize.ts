import { CATALOG } from "@/lib/catalog/components";
import { estimate } from "@/lib/estimation/calc";
import { formatBytes, formatCount } from "@/lib/estimation/format";
import type { Attempt, GraphNode } from "@/lib/schema";

/**
 * Compact text form of a design (SPEC §7). Far fewer tokens than JSON, and easier for a model
 * to reason about.
 */

const q = (s: string) => JSON.stringify(s);

/** Instance counts are rendered as "x3" / "x2-10" instead. */
const INSTANCE_KEYS = new Set(["instances", "instancesMin", "instancesMax"]);

function configText(n: GraphNode): string {
  const defaults = CATALOG[n.type]?.defaultConfig ?? {};
  const parts: string[] = [];
  for (const [key, value] of Object.entries(n.data.config)) {
    if (INSTANCE_KEYS.has(key) || value === undefined || value === "") continue;
    if (Array.isArray(value) && !value.length) continue;
    if (value === true) parts.push(key);
    // A switched-off default is a deliberate choice worth showing; other falses are noise.
    else if (value === false) {
      if (defaults[key] === true) parts.push(`!${key}`);
    } else parts.push(`${key}: ${Array.isArray(value) ? value.join("/") : String(value)}`);
  }
  return parts.length ? ` {${parts.join(", ")}}` : "";
}

function instances(n: GraphNode): string {
  const c = n.data.config;
  const min = Number(c.instancesMin ?? c.instances ?? 1);
  const max = Number(c.instancesMax ?? min);
  if (max > min) return ` x${min}-${max}`;
  return min > 1 ? ` x${min}` : "";
}

export function serializeGraph(a: Pick<Attempt, "graph" | "apis">): string {
  const infra = a.graph.nodes.filter((n) => n.type !== "note" && n.type !== "group");
  const lines: string[] = ["NODES:"];
  for (const n of infra)
    lines.push(`  ${n.id} ${n.type} ${q(n.data.label)}${instances(n)}${configText(n)}`);
  if (!infra.length) lines.push("  (none)");

  lines.push("EDGES (caller -> callee):");
  for (const e of a.graph.edges) {
    const api = e.apiId ? a.apis.find((x) => x.id === e.apiId) : undefined;
    const bits = [
      `${e.source}->${e.target}`,
      e.protocol,
      e.mode,
      e.op,
      api && `calls ${api.method} ${api.path}`,
      e.label && q(e.label),
    ];
    lines.push(`  ${bits.filter(Boolean).join(" ")}`);
  }
  if (!a.graph.edges.length) lines.push("  (none)");

  lines.push("APIS:");
  for (const api of a.apis) {
    const flags = [
      api.auth && "auth",
      api.idempotent && "idempotent",
      api.rateLimited && "rate-limited",
      api.pagination && api.pagination !== "none" && `${api.pagination}-paginated`,
    ].filter(Boolean);
    const io = [
      api.request && `req ${api.request}`,
      api.response && `res ${api.response}`,
      api.statusCodes && `codes ${api.statusCodes}`,
    ].filter(Boolean);
    lines.push(
      `  ${api.ownerNodeId} ${api.method} ${api.path}${flags.length ? ` [${flags.join(", ")}]` : ""}${io.length ? ` ${io.join("; ")}` : ""}`,
    );
  }
  if (!a.apis.length) lines.push("  (none)");

  const notes = [
    ...a.graph.nodes
      .filter((n) => n.data.note && n.type !== "note")
      .map((n) => `  ${n.id}: ${q(n.data.note!)}`),
    ...a.graph.edges.filter((e) => e.note).map((e) => `  ${e.source}->${e.target}: ${q(e.note!)}`),
    ...a.graph.nodes
      .filter((n) => n.type === "note" && n.data.note)
      .map((n) => `  sticky: ${q(n.data.note!)}`),
    ...a.graph.nodes.filter((n) => n.type === "group").map((n) => `  group ${q(n.data.label)}`),
  ];
  lines.push("NOTES:", ...(notes.length ? notes : ["  (none)"]));
  return lines.join("\n");
}

export function serializeAttempt(a: Attempt): string {
  const r = a.requirements;
  const list = (title: string, items: string[]) =>
    `${title}:\n${items.length ? items.map((i) => `  - ${i}`).join("\n") : "  (none)"}`;

  const e = a.estimation;
  const out = estimate(e);
  const estimation =
    e.dau > 0
      ? [
          `ESTIMATION: DAU ${formatCount(e.dau)}, ${e.writesPerUserPerDay} writes/user/day, read:write ${e.readWriteRatio}:1, object ${e.objectSize} ${e.objectSizeUnit}, retention ${e.retentionYears}y, peak x${e.peakFactor}`,
          `  -> write QPS ${formatCount(out.writeQpsAvg)} avg / ${formatCount(out.writeQpsPeak)} peak; read QPS ${formatCount(out.readQpsAvg)} avg / ${formatCount(out.readQpsPeak)} peak`,
          `  -> storage ${formatBytes(out.storagePerDayBytes)}/day, ${formatBytes(out.storageTotalBytes)} total; cache ~${formatBytes(out.cacheMemoryBytes)}`,
        ].join("\n")
      : "ESTIMATION: (not done)";

  return [
    list("CLARIFYING QUESTIONS", r.questions),
    list("FUNCTIONAL REQUIREMENTS", r.functional),
    list("NON-FUNCTIONAL REQUIREMENTS", r.nonFunctional),
    list("OUT OF SCOPE", r.outOfScope),
    estimation + (e.notes ? `\n  notes: ${q(e.notes)}` : ""),
    list(
      "ENTITIES",
      a.entities.map(
        (x) =>
          `${x.name}${x.storeNodeId ? ` (in ${x.storeNodeId})` : ""}: ${x.fields.replace(/\n/g, ", ")}`,
      ),
    ),
    serializeGraph(a),
  ].join("\n\n");
}

/** FNV-1a, 32-bit: tiny, deterministic, same result on client and server. */
export function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function designHash(a: Attempt): string {
  return hashText(serializeAttempt(a));
}
