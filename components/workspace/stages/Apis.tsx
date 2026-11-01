"use client";

import { DoorOpen, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNodeOptions } from "@/components/canvas/useNodeOptions";
import { addStageNode } from "../addStageNode";
import { highlightLater } from "@/components/canvas/useFocusOnCanvas";
import { useAttemptStore } from "@/store/attempt";
import { API_OWNER_TYPES, FRONTEND_API_OWNER_TYPES } from "@/lib/workspace/stages";
import { useWorkspaceStore } from "@/store/workspace";
import { ApiList } from "../ApiList";
import { StageIntro } from "./StageIntro";

/** Adds an owner node to the canvas without needing the canvas to be mounted. */
const addOwner = addStageNode;

export function Apis({ track = "backend" }: { track?: import("@/lib/schema").Track }) {
  const frontend = track === "frontend";
  const owners = useNodeOptions(
    frontend
      ? FRONTEND_API_OWNER_TYPES
      : API_OWNER_TYPES.filter((t) => !FRONTEND_API_OWNER_TYPES.includes(t)),
  );

  return (
    <div className="space-y-6">
      <StageIntro
        title={frontend ? "Component & network contracts" : "API design"}
        text={
          frontend
            ? "Use RPC for props, callbacks or local functions. Put HTTP/WS server endpoints under an External Service; the API Client owns only its local wrapper. Specify payloads, error states and cancellation."
            : "Endpoints belong to a service or gateway. Owners are canvas nodes, so they show up in the Design stage too."
        }
      />

      {owners.map((owner) => (
        <OwnerCard key={owner.value} nodeId={owner.value} />
      ))}

      {owners.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          {frontend
            ? "Add a component or API client to define contracts. Add an External Service on the canvas for server endpoints."
            : "Add a service or gateway to start defining endpoints."}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => addOwner(frontend ? "ui_component" : "service")}>
          <Server /> {frontend ? "Add component" : "Add service"}
        </Button>
        <Button variant="outline" onClick={() => addOwner(frontend ? "api_client" : "api_gateway")}>
          <DoorOpen /> {frontend ? "Add API client" : "Add API gateway"}
        </Button>
        {frontend && (
          <Button
            variant="outline"
            onClick={() => addOwner("external_service", "Existing Backend API")}
          >
            <Server /> Add backend dependency
          </Button>
        )}
      </div>
    </div>
  );
}

function OwnerCard({ nodeId }: { nodeId: string }) {
  const node = useWorkspaceStore((s) => s.nodes.find((n) => n.id === nodeId));
  const updateNodeData = useWorkspaceStore((s) => s.updateNodeData);
  if (!node) return null;

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Input
          aria-label="Owner name"
          className="h-8 max-w-xs font-medium"
          value={node.data.label}
          onChange={(e) => updateNodeData(nodeId, { label: e.target.value })}
        />
        <span className="text-muted-foreground text-xs">
          {node.type} · {node.id}
        </span>
      </div>
      <ApiList ownerNodeId={nodeId} />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          highlightLater({ nodeIds: [nodeId], edgeIds: [] });
          useAttemptStore.getState().setStage("design");
        }}
      >
        Show owner on canvas →
      </Button>
    </section>
  );
}
