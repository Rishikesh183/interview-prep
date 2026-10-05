"use client";

import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getComponent } from "@/lib/catalog/components";
import type { AppNode } from "@/lib/graph/convert";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/store/workspace";
import { FormRow } from "@/components/form/FormRow";
import { ApiList } from "@/components/workspace/ApiList";
import { API_OWNER_TYPES } from "@/lib/workspace/stages";
import { ConfigForm } from "./form/ConfigForm";
import { CATEGORY_STYLES } from "./nodes/categoryStyles";

export function Inspector({ node }: { node: AppNode }) {
  const updateNodeData = useWorkspaceStore((s) => s.updateNodeData);
  const duplicateSelected = useWorkspaceStore((s) => s.duplicateSelected);
  const deleteSelected = useWorkspaceStore((s) => s.deleteSelected);
  const type = node.type ?? "";
  const def = getComponent(type);
  if (!def) return null;
  const Icon = def.icon;
  const ownsApis = API_OWNER_TYPES.includes(type);

  const noteEditor = (
    <FormRow id={`${node.id}-note`} label="Notes / justification">
      <Textarea
        id={`${node.id}-note`}
        rows={8}
        className="text-xs"
        placeholder="Why this component? Trade-offs, alternatives considered..."
        value={node.data.note ?? ""}
        onChange={(e) => updateNodeData(node.id, { note: e.target.value })}
      />
    </FormRow>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-md",
            CATEGORY_STYLES[def.category].icon,
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{def.label}</div>
          <div className="text-muted-foreground text-xs">
            {node.id} · {def.description}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={duplicateSelected}
          title="Duplicate (Ctrl+D)"
        >
          <Copy />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={deleteSelected} title="Delete (Del)">
          <Trash2 />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {type !== "note" && (
          <FormRow id={`${node.id}-label`} label="Label">
            <Input
              id={`${node.id}-label`}
              className="h-8"
              value={node.data.label}
              onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
            />
          </FormRow>
        )}

        {def.category === "annotation" ? (
          type === "note" && noteEditor
        ) : (
          <Tabs defaultValue="config">
            <TabsList className="w-full">
              <TabsTrigger value="config">Config</TabsTrigger>
              {ownsApis && <TabsTrigger value="apis">APIs</TabsTrigger>}
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>
            <TabsContent value="config" className="pt-2">
              <ConfigForm nodeId={node.id} type={type} config={node.data.config} />
            </TabsContent>
            {ownsApis && (
              <TabsContent value="apis" className="pt-2">
                <ApiList ownerNodeId={node.id} compact />
              </TabsContent>
            )}
            <TabsContent value="notes" className="pt-2">
              {noteEditor}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
