"use client";

import { ArrowRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AppEdge } from "@/lib/graph/convert";
import { EdgeModeSchema, EdgeOpSchema, ProtocolSchema } from "@/lib/schema";
import { useWorkspaceStore } from "@/store/workspace";
import { FormRow } from "@/components/form/FormRow";
import { SimpleSelect } from "@/components/form/SimpleSelect";

const OP_OPTIONS = [
  { value: "read", label: "read" },
  { value: "write", label: "write" },
  { value: "read_write", label: "read + write" },
];

export function EdgeInspector({ edge }: { edge: AppEdge }) {
  const updateEdgeData = useWorkspaceStore((s) => s.updateEdgeData);
  const deleteSelected = useWorkspaceStore((s) => s.deleteSelected);
  const source = useWorkspaceStore((s) => s.nodes.find((n) => n.id === edge.source));
  const target = useWorkspaceStore((s) => s.nodes.find((n) => n.id === edge.target));
  const apis = useWorkspaceStore((s) => s.apis);
  const data = edge.data;
  if (!data) return null;

  // An edge calls an endpoint owned by the node it points at.
  const apiOptions = apis
    .filter((a) => a.ownerNodeId === edge.target)
    .map((a) => ({ value: a.id, label: `${a.method} ${a.path}` }));
  const id = (k: string) => `${edge.id}-${k}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">Connection {edge.id}</div>
          <div className="text-muted-foreground flex items-center gap-1 truncate text-xs">
            {source?.data.label ?? edge.source}
            <ArrowRight className="size-3 shrink-0" />
            {target?.data.label ?? edge.target}
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={deleteSelected} title="Delete (Del)">
          <Trash2 />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        <div className="grid grid-cols-2 gap-3">
          <FormRow id={id("protocol")} label="Protocol">
            <SimpleSelect
              id={id("protocol")}
              value={data.protocol}
              options={ProtocolSchema.options}
              onChange={(v) => v && updateEdgeData(edge.id, { protocol: ProtocolSchema.parse(v) })}
            />
          </FormRow>
          <FormRow id={id("mode")} label="Mode">
            <SimpleSelect
              id={id("mode")}
              value={data.mode}
              options={EdgeModeSchema.options}
              onChange={(v) => v && updateEdgeData(edge.id, { mode: EdgeModeSchema.parse(v) })}
            />
          </FormRow>
        </div>

        <FormRow id={id("op")} label="Operation">
          <SimpleSelect
            id={id("op")}
            value={data.op}
            options={OP_OPTIONS}
            allowNone
            onChange={(v) => updateEdgeData(edge.id, { op: v ? EdgeOpSchema.parse(v) : undefined })}
          />
        </FormRow>

        <FormRow
          id={id("api")}
          label="Linked API"
          help={apiOptions.length ? undefined : "No APIs defined on the target node yet."}
        >
          <SimpleSelect
            id={id("api")}
            value={data.apiId}
            options={apiOptions}
            allowNone
            onChange={(v) => updateEdgeData(edge.id, { apiId: v })}
          />
        </FormRow>

        <FormRow id={id("label")} label="Label">
          <Input
            id={id("label")}
            className="h-8"
            placeholder="e.g. publish tweet event"
            value={data.label ?? ""}
            onChange={(e) => updateEdgeData(edge.id, { label: e.target.value })}
          />
        </FormRow>

        <FormRow id={id("note")} label="Notes">
          <Textarea
            id={id("note")}
            rows={5}
            className="text-xs"
            placeholder="Why sync/async? Retries, timeouts, idempotency..."
            value={data.note ?? ""}
            onChange={(e) => updateEdgeData(edge.id, { note: e.target.value })}
          />
        </FormRow>
      </div>
    </div>
  );
}
