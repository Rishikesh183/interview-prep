import { getComponent, parseConfig } from "@/lib/catalog/components";
import { expandTypes } from "@/lib/catalog/groups";
import { inferEdgeDefaults } from "@/lib/catalog/edges";
import { API_OWNER_TYPES, STATE_OWNER_TYPES } from "@/lib/workspace/stages";
import type { ApiEndpoint, Entity } from "@/lib/schema";
import type { AppNode, AppEdge } from "./convert";

export type EditorDocument = {
  nodes: AppNode[];
  edges: AppEdge[];
  apis: ApiEndpoint[];
  entities: Entity[];
};

/** Repair only links made invalid by an explicit structural change. Entity definitions survive. */
export function repairOwnership(
  document: EditorDocument,
  changedTypes: ReadonlySet<string> = new Set(),
): EditorDocument {
  const byId = new Map(document.nodes.map((n) => [n.id, n]));
  const apis = document.apis.filter(
    (a) =>
      byId.has(a.ownerNodeId) &&
      (!changedTypes.has(a.ownerNodeId) ||
        API_OWNER_TYPES.includes(byId.get(a.ownerNodeId)?.type ?? "")),
  );
  const apiById = new Map(apis.map((a) => [a.id, a]));
  const nodes = document.nodes.map((n) => {
    const config = { ...n.data.config };
    for (const [key, field] of Object.entries(getComponent(n.type ?? "")?.fields ?? {})) {
      if (field.kind !== "nodeRef" || !config[key]) continue;
      const target = byId.get(String(config[key]));
      if (
        !target ||
        (changedTypes.has(target.id) && !expandTypes(field.nodeTypes)?.has(target.type ?? ""))
      )
        delete config[key];
    }
    return { ...n, data: { ...n.data, config } };
  });
  const edges = document.edges
    .filter((e) => byId.has(e.source) && byId.has(e.target))
    .map((e) => {
      if (e.data?.apiId && apiById.get(e.data.apiId)?.ownerNodeId !== e.target)
        return { ...e, data: { ...e.data, apiId: undefined } };
      return e;
    });
  const entities = document.entities.map((e) =>
    e.storeNodeId &&
    (!byId.has(e.storeNodeId) ||
      (changedTypes.has(e.storeNodeId) &&
        !STATE_OWNER_TYPES.includes(byId.get(e.storeNodeId)?.type ?? "")))
      ? { ...e, storeNodeId: undefined }
      : e,
  );
  return { nodes, edges, apis, entities };
}

export function planReplacement(document: EditorDocument, nodeId: string, type: string) {
  const original = document.nodes.find((n) => n.id === nodeId);
  const before = getComponent(original?.type ?? "");
  const after = getComponent(type);
  if (
    !original ||
    !before ||
    !after ||
    before.category === "annotation" ||
    after.category === "annotation" ||
    type === original.type
  )
    return null;
  const updated: AppNode = {
    ...original,
    type,
    data: {
      ...original.data,
      label: original.data.label === before.label ? after.label : original.data.label,
      config: parseConfig(type, original.data.config),
    },
  };
  const nodes = document.nodes.map((n) => (n.id === nodeId ? updated : n));
  const typeOf = new Map(document.nodes.map((n) => [n.id, n.type ?? ""]));
  let protocolsChanged = 0,
    customProtocols = 0;
  const edges = document.edges.map((e) => {
    if (e.source !== nodeId && e.target !== nodeId) return e;
    const oldDefault = inferEdgeDefaults(typeOf.get(e.source) ?? "", typeOf.get(e.target) ?? "");
    const nextDefault = inferEdgeDefaults(
      e.source === nodeId ? type : (typeOf.get(e.source) ?? ""),
      e.target === nodeId ? type : (typeOf.get(e.target) ?? ""),
    );
    const inferred =
      !e.data || (e.data.protocol === oldDefault.protocol && e.data.mode === oldDefault.mode);
    if (!inferred) {
      customProtocols++;
      return e;
    }
    if (oldDefault.protocol !== nextDefault.protocol || oldDefault.mode !== nextDefault.mode)
      protocolsChanged++;
    return { ...e, data: { ...e.data, ...nextDefault } };
  });
  const result = repairOwnership({ ...document, nodes, edges }, new Set([nodeId]));
  return {
    document: result,
    connections: edges.filter((e) => e.source === nodeId || e.target === nodeId).length,
    protocolsChanged,
    customProtocols,
    removedApis: document.apis.filter((a) => !result.apis.some((b) => a.id === b.id)),
    detachedEntities: document.entities
      .filter((e, i) => e.storeNodeId && !result.entities[i].storeNodeId)
      .map((e) => e.name),
    clearedReferences: document.nodes.flatMap((n, i) =>
      Object.keys(n.data.config)
        .filter(
          (key) =>
            getComponent(n.type ?? "")?.fields[key]?.kind === "nodeRef" &&
            n.data.config[key] &&
            !result.nodes[i].data.config[key],
        )
        .map((key) => `${n.data.label}: ${key}`),
    ),
  };
}
