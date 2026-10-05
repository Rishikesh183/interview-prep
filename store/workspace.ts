import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from "@xyflow/react";
import { temporal } from "zundo";
import { create, useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { getComponent } from "@/lib/catalog/components";
import { inferEdgeDefaults } from "@/lib/catalog/edges";
import {
  EDGE_TYPE,
  fromGraph,
  nextId,
  toGraph,
  type AppEdge,
  type AppNode,
} from "@/lib/graph/convert";
import { snapToGrid } from "@/lib/graph/placement";
import type { ApiEndpoint, EdgeData, Graph, NodeData } from "@/lib/schema";

type GraphState = { nodes: AppNode[]; edges: AppEdge[]; apis: ApiEndpoint[] };

/** Nodes/edges called out by a lint issue (or later, an AI review issue). Not undoable. */
export type Highlight = { nodeIds: string[]; edgeIds: string[] };
const NO_HIGHLIGHT: Highlight = { nodeIds: [], edgeIds: [] };

export type WorkspaceState = GraphState & {
  highlight: Highlight;
  setHighlight: (h: Highlight) => void;
  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<AppEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: string, position: XYPosition) => string | null;
  updateNodeData: (id: string, patch: Partial<NodeData>) => void;
  updateNodeConfig: (id: string, key: string, value: unknown) => void;
  updateEdgeData: (id: string, patch: Partial<EdgeData>) => void;
  selectEdge: (id: string) => void;
  selectNodes: (ids: string[]) => void;
  addApi: (ownerNodeId: string) => string;
  updateApi: (id: string, patch: Partial<ApiEndpoint>) => void;
  removeApi: (id: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  setGraph: (graph: Graph) => void;
  setApis: (apis: ApiEndpoint[]) => void;
  getGraph: () => Graph;
};

const ANNOTATION_SIZE: Record<string, { width: number; height: number }> = {
  note: { width: 200, height: 120 },
  group: { width: 420, height: 280 },
};

const DUPLICATE_OFFSET = 40;
/** Changes closer together than this collapse into one undo step (drags, typing). */
const HISTORY_COALESCE_MS = 500;

/** History tracks only what the user authored, not selection or measurement. */
function historyView(state: GraphState): GraphState {
  return {
    nodes: state.nodes.map(({ selected: _s, dragging: _d, measured: _m, resizing: _r, ...n }) => n),
    edges: state.edges.map(({ selected: _s, ...e }) => e),
    apis: state.apis,
  };
}

/** After nodes are removed: drop APIs they owned and unlink edges from those APIs. */
function pruneApis(nodes: AppNode[], edges: AppEdge[], apis: ApiEndpoint[]) {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const keptApis = apis.filter((a) => nodeIds.has(a.ownerNodeId));
  return {
    apis: keptApis.length === apis.length ? apis : keptApis,
    edges: unlinkApis(edges, keptApis),
  };
}

function unlinkApis(edges: AppEdge[], apis: ApiEndpoint[]): AppEdge[] {
  const apiIds = new Set(apis.map((a) => a.id));
  return edges.map((e) =>
    e.data?.apiId && !apiIds.has(e.data.apiId)
      ? { ...e, data: { ...e.data, apiId: undefined } }
      : e,
  );
}

export const useWorkspaceStore = create<WorkspaceState>()(
  temporal(
    (set, get) => ({
      nodes: [],
      edges: [],
      apis: [],
      highlight: NO_HIGHLIGHT,
      setHighlight: (highlight) => set({ highlight }),

      onNodesChange: (changes) => {
        const nodes = applyNodeChanges(changes, get().nodes);
        if (!changes.some((c) => c.type === "remove")) return set({ nodes });
        const edges = get().edges.filter(
          (e) => nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target),
        );
        set({ nodes, ...pruneApis(nodes, edges, get().apis) });
      },
      onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),

      onConnect: (connection) => {
        const { nodes, edges } = get();
        if (connection.source === connection.target) return;
        const source = nodes.find((n) => n.id === connection.source);
        const target = nodes.find((n) => n.id === connection.target);
        if (!source || !target) return;
        const edge: AppEdge = {
          ...connection,
          id: nextId(
            "e",
            edges.map((e) => e.id),
          ),
          type: EDGE_TYPE,
          data: inferEdgeDefaults(source.type ?? "", target.type ?? ""),
        };
        set({ edges: addEdge(edge, edges) });
      },

      addNode: (type, position) => {
        const def = getComponent(type);
        if (!def) return null;
        const { nodes } = get();
        const id = nextId(
          "n",
          nodes.map((n) => n.id),
        );
        const node: AppNode = {
          id,
          type,
          position: snapToGrid(position),
          selected: true,
          data: {
            label: type === "note" ? "" : def.label,
            config: { ...def.defaultConfig },
          },
          ...ANNOTATION_SIZE[type],
        };
        if (type === "group") node.zIndex = -1;
        set({ nodes: [...nodes.map((n) => ({ ...n, selected: false })), node] });
        return id;
      },

      updateNodeData: (id, patch) =>
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...patch } } : n,
          ),
        }),

      updateNodeConfig: (id, key, value) =>
        set({
          nodes: get().nodes.map((n) =>
            n.id === id
              ? { ...n, data: { ...n.data, config: { ...n.data.config, [key]: value } } }
              : n,
          ),
        }),

      updateEdgeData: (id, patch) =>
        set({
          edges: get().edges.map((e) =>
            e.id === id && e.data ? { ...e, data: { ...e.data, ...patch } } : e,
          ),
        }),

      selectEdge: (id) =>
        set({
          nodes: get().nodes.map((n) => (n.selected ? { ...n, selected: false } : n)),
          edges: get().edges.map((e) =>
            e.selected === (e.id === id) ? e : { ...e, selected: e.id === id },
          ),
        }),

      selectNodes: (ids) => {
        const wanted = new Set(ids);
        set({
          nodes: get().nodes.map((n) =>
            Boolean(n.selected) === wanted.has(n.id) ? n : { ...n, selected: wanted.has(n.id) },
          ),
          edges: get().edges.map((e) => (e.selected ? { ...e, selected: false } : e)),
        });
      },

      addApi: (ownerNodeId) => {
        const { apis } = get();
        const id = nextId(
          "a",
          apis.map((a) => a.id),
        );
        set({ apis: [...apis, { id, ownerNodeId, method: "GET", path: "/v1/", auth: true }] });
        return id;
      },

      updateApi: (id, patch) =>
        set({ apis: get().apis.map((a) => (a.id === id ? { ...a, ...patch } : a)) }),

      removeApi: (id) => {
        const apis = get().apis.filter((a) => a.id !== id);
        set({ apis, edges: unlinkApis(get().edges, apis) });
      },

      deleteSelected: () => {
        const { nodes, edges, apis } = get();
        const removed = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
        const keptNodes = nodes.filter((n) => !removed.has(n.id));
        const keptEdges = edges.filter(
          (e) => !e.selected && !removed.has(e.source) && !removed.has(e.target),
        );
        set({ nodes: keptNodes, ...pruneApis(keptNodes, keptEdges, apis) });
      },

      duplicateSelected: () => {
        const { nodes, edges } = get();
        const selected = nodes.filter((n) => n.selected);
        if (!selected.length) return;

        const nodeIds = nodes.map((n) => n.id);
        const idMap = new Map<string, string>();
        const copies: AppNode[] = selected.map((n) => {
          const id = nextId("n", nodeIds);
          nodeIds.push(id);
          idMap.set(n.id, id);
          const { measured: _m, ...rest } = n;
          return {
            ...rest,
            id,
            selected: true,
            position: { x: n.position.x + DUPLICATE_OFFSET, y: n.position.y + DUPLICATE_OFFSET },
            data: structuredClone(n.data),
          };
        });

        const edgeIds = edges.map((e) => e.id);
        const edgeCopies: AppEdge[] = edges
          .filter((e) => idMap.has(e.source) && idMap.has(e.target))
          .map((e) => {
            const id = nextId("e", edgeIds);
            edgeIds.push(id);
            return {
              ...e,
              id,
              selected: false,
              source: idMap.get(e.source)!,
              target: idMap.get(e.target)!,
              data: e.data ? { ...e.data, apiId: undefined } : e.data,
            };
          });

        set({
          nodes: [...nodes.map((n) => ({ ...n, selected: false })), ...copies],
          edges: [...edges.map((e) => ({ ...e, selected: false })), ...edgeCopies],
        });
      },

      setGraph: (graph) => set({ ...fromGraph(graph), highlight: NO_HIGHLIGHT }),
      setApis: (apis) => set({ apis }),
      getGraph: () => toGraph(get().nodes, get().edges),
    }),
    {
      partialize: (state): GraphState => historyView(state),
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      limit: 100,
      // zundo types the wrapped function as setState, but at runtime it is its internal
      // 4-argument _handleSet; forward every argument untouched.
      handleSet: (handleSet) => {
        const record = handleSet as unknown as (...args: unknown[]) => void;
        let last = 0;
        return (...args) => {
          const now = Date.now();
          if (now - last > HISTORY_COALESCE_MS) record(...args);
          last = now;
        };
      },
    },
  ),
);

export function useHistory() {
  return useStore(
    useWorkspaceStore.temporal,
    useShallow((s) => ({
      undo: s.undo,
      redo: s.redo,
      canUndo: s.pastStates.length > 0,
      canRedo: s.futureStates.length > 0,
    })),
  );
}

export function resetHistory() {
  useWorkspaceStore.temporal.getState().clear();
}
