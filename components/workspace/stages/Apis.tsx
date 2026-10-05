"use client";

import { DoorOpen, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNodeOptions } from "@/components/canvas/useNodeOptions";
import { findFreePosition, SLOT } from "@/lib/graph/placement";
import { API_OWNER_TYPES } from "@/lib/workspace/stages";
import { useWorkspaceStore } from "@/store/workspace";
import { ApiList } from "../ApiList";
import { StageIntro } from "./StageIntro";

/** Adds an owner node to the canvas without needing the canvas to be mounted. */
function addOwner(type: string) {
  const { nodes, addNode } = useWorkspaceStore.getState();
  const occupied = nodes.map((n) => ({
    ...n.position,
    width: n.measured?.width ?? n.width ?? SLOT.width,
    height: n.measured?.height ?? n.height ?? SLOT.height,
  }));
  addNode(type, findFreePosition({ x: 0, y: 0 }, occupied));
}

export function Apis() {
  const owners = useNodeOptions(API_OWNER_TYPES);

  return (
    <div className="space-y-6">
      <StageIntro
        title="API design"
        text="Endpoints belong to a service or gateway. Owners are canvas nodes, so they show up in the Design stage too."
      />

      {owners.map((owner) => (
        <OwnerCard key={owner.value} nodeId={owner.value} />
      ))}

      {owners.length === 0 && (
        <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          Add a service or gateway to start defining endpoints.
        </p>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => addOwner("service")}>
          <Server /> Add service
        </Button>
        <Button variant="outline" onClick={() => addOwner("api_gateway")}>
          <DoorOpen /> Add API gateway
        </Button>
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
    </section>
  );
}
