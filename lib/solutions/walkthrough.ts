import type { Graph, ReferenceApproach } from "@/lib/schema";
import { GROUPS } from "@/lib/catalog/groups";
import { API_OWNER_TYPES } from "@/lib/workspace/stages";

/** Reveal the canonical final graph cumulatively; never maintain a second diagram. */
export function graphAtStep(ref: ReferenceApproach, index: number): Graph {
  if (!ref.graph || !ref.walkthrough) return ref.graph ?? { nodes: [], edges: [] };
  const steps = ref.walkthrough.buildSteps.slice(0, index + 1);
  const nodes = new Set(steps.flatMap((s) => s.nodeIds));
  const edges = new Set(steps.flatMap((s) => s.edgeIds));
  return {
    nodes: ref.graph.nodes.filter((n) => nodes.has(n.id)),
    edges: ref.graph.edges.filter(
      (e) => edges.has(e.id) && nodes.has(e.source) && nodes.has(e.target),
    ),
  };
}

export function validateWalkthrough(ref: ReferenceApproach): string[] {
  const w = ref.walkthrough;
  if (!w) return [];
  if (!ref.graph?.nodes.length) return ["walkthrough requires a final HLD"];
  const errors: string[] = [];
  const nodes = new Map(ref.graph.nodes.map((n) => [n.id, n]));
  const edges = new Map(ref.graph.edges.map((e) => [e.id, e]));
  const apis = new Map(ref.apis.map((a) => [a.id, a]));
  const entities = new Map(ref.entities.map((e) => [e.name, e]));
  const unique = (values: string[], kind: string) => {
    if (new Set(values).size !== values.length) errors.push(`duplicate ${kind}`);
  };
  unique(
    ref.graph.nodes.map((n) => n.id),
    "node IDs",
  );
  unique(
    ref.graph.edges.map((e) => e.id),
    "edge IDs",
  );
  unique(
    ref.apis.map((a) => a.id),
    "API IDs",
  );
  unique(
    ref.entities.map((e) => e.name),
    "entity names",
  );
  unique(
    w.components.map((c) => c.nodeId),
    "component explanations",
  );
  unique(
    w.apiDetails.map((a) => a.apiId),
    "API explanations",
  );
  unique(
    w.entityDetails.map((e) => e.entityName),
    "entity explanations",
  );
  unique(
    w.flows.map((f) => f.id),
    "flow IDs",
  );
  const check = (values: string[], available: Map<string, unknown>, kind: string) => {
    for (const id of values) if (!available.has(id)) errors.push(`unknown ${kind}: ${id}`);
  };
  check(
    w.components.map((c) => c.nodeId),
    nodes,
    "component",
  );
  check(
    w.apiDetails.map((a) => a.apiId),
    apis,
    "API",
  );
  check(
    w.entityDetails.map((e) => e.entityName),
    entities,
    "entity",
  );
  for (const node of ref.graph.nodes)
    if (!["note", "group"].includes(node.type) && !w.components.some((c) => c.nodeId === node.id))
      errors.push(`component ${node.id} needs an explanation`);
  for (const entity of ref.entities) {
    const store = entity.storeNodeId ? nodes.get(entity.storeNodeId) : undefined;
    if (
      !store ||
      ![
        ...GROUPS["@storage"],
        ...GROUPS["@frontend-state"],
        "cache",
        "coordination",
        "event_stream",
        "message_queue",
        "id_generator",
        "geo_index",
      ].includes(store.type)
    )
      errors.push(`entity ${entity.name} needs a valid state/storage owner`);
    if (!entity.fields.trim() || !w.entityDetails.some((e) => e.entityName === entity.name))
      errors.push(`entity ${entity.name} needs fields and an explanation`);
  }
  const owners = API_OWNER_TYPES;
  for (const api of ref.apis) {
    if (!owners.includes(nodes.get(api.ownerNodeId)?.type ?? ""))
      errors.push(`API ${api.id} has an invalid owner`);
    if (
      !api.request?.trim() ||
      !api.response?.trim() ||
      !api.statusCodes?.trim() ||
      !w.apiDetails.some((a) => a.apiId === api.id)
    )
      errors.push(`API ${api.id} needs request, response, status codes and explanation`);
  }
  if (!ref.apis.length && !w.sectionApplicability.apis)
    errors.push("missing API applicability explanation");
  if (!ref.entities.length && !w.sectionApplicability.entities)
    errors.push("missing entity applicability explanation");
  for (const edge of ref.graph.edges)
    if (edge.apiId && apis.get(edge.apiId)?.ownerNodeId !== edge.target)
      errors.push(`edge ${edge.id} links an API not owned by its target`);
  const revealedNodes = new Set<string>();
  const revealedEdges = new Set<string>();
  const revealedApis = new Set<string>();
  const revealedEntities = new Set<string>();
  for (const step of w.buildSteps) {
    check(step.nodeIds, nodes, "node");
    check(step.edgeIds, edges, "edge");
    check(step.apiIds, apis, "API");
    check(step.entityNames, entities, "entity");
    step.nodeIds.forEach((id) => revealedNodes.add(id));
    for (const id of step.edgeIds) {
      const edge = edges.get(id);
      if (edge && (!revealedNodes.has(edge.source) || !revealedNodes.has(edge.target)))
        errors.push(`build step ${step.title}: edge ${id} precedes its endpoints`);
      revealedEdges.add(id);
    }
    for (const id of step.apiIds) {
      const api = apis.get(id);
      if (api && !revealedNodes.has(api.ownerNodeId))
        errors.push(`build step ${step.title}: API ${id} precedes its owner`);
      revealedApis.add(id);
    }
    for (const name of step.entityNames) {
      const entity = entities.get(name);
      if (entity?.storeNodeId && !revealedNodes.has(entity.storeNodeId))
        errors.push(`build step ${step.title}: entity ${name} precedes its store`);
      revealedEntities.add(name);
    }
  }
  if (
    revealedNodes.size !== nodes.size ||
    revealedEdges.size !== edges.size ||
    revealedApis.size !== apis.size ||
    revealedEntities.size !== entities.size
  )
    errors.push("build steps must cover the complete graph, APIs and entities");
  for (const flow of w.flows) {
    if (flow.apiId) check([flow.apiId], apis, "flow API");
    const owner = flow.apiId ? apis.get(flow.apiId)?.ownerNodeId : undefined;
    if (owner && !flow.steps.some((step) => step.nodeIds.includes(owner)))
      errors.push(`flow ${flow.id}: contract owner is outside its path`);
    for (const step of flow.steps) {
      check(step.nodeIds, nodes, "flow node");
      check(step.edgeIds, edges, "flow edge");
      for (const id of step.edgeIds) {
        const e = edges.get(id);
        if (e && (!step.nodeIds.includes(e.source) || !step.nodeIds.includes(e.target)))
          errors.push(`flow ${flow.id}: edge ${id} is outside its step's nodes`);
      }
      for (let i = 1; i < step.edgeIds.length; i++) {
        const previous = edges.get(step.edgeIds[i - 1]);
        const current = edges.get(step.edgeIds[i]);
        if (previous && current && previous.target !== current.source)
          errors.push(`flow ${flow.id}: edges are not a directed route`);
      }
    }
  }
  for (const failure of w.failureCases) check(failure.nodeIds, nodes, "failure node");
  return errors;
}
