"use client";

import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  connectedMicroservices,
  MAX_SERVICE_COUNT,
  planServiceCount,
  SERVICE_UPSTREAM_TYPES,
} from "@/lib/graph/serviceGroups";
import { useWorkspaceStore } from "@/store/workspace";

/** Uses real graph connections rather than hidden preset-only membership. */
export function MicroserviceGroup({ nodeId }: { nodeId: string }) {
  const document = useWorkspaceStore();
  const node = document.nodes.find((n) => n.id === nodeId);
  const { fitView } = useReactFlow();
  const [requested, setRequested] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState("");
  if (!node || !SERVICE_UPSTREAM_TYPES.includes(node.type ?? "")) return null;
  const services = connectedMicroservices(document, nodeId);
  const value = requested ?? String(services.length);
  const count = value.trim() === "" ? NaN : Number(value);
  const valid = Number.isInteger(count) && count >= 0 && count <= MAX_SERVICE_COUNT;
  const plan = valid ? planServiceCount(document, nodeId, count) : null;
  const impact = plan
    ? JSON.stringify({
        nodes: plan.removed.map((n) => n.id),
        edges: plan.removedEdges.map((e) => e.id),
        apis: plan.removedApis.map((a) => a.id),
        entities: plan.detachedEntities,
      })
    : "";
  const parents =
    node.type === "microservice"
      ? document.nodes.filter(
          (n) =>
            n.id !== nodeId &&
            SERVICE_UPSTREAM_TYPES.includes(n.type ?? "") &&
            document.edges.some((e) => e.source === n.id && e.target === nodeId),
        )
      : document.nodes.filter(
          (n) =>
            n.id !== nodeId &&
            n.type === "rate_limiter" &&
            document.edges.some((e) => e.source === nodeId && e.target === n.id),
        );
  return (
    <section className="space-y-3 rounded-md border p-3" aria-label="Microservice group">
      <div>
        <h3 className="text-xs font-semibold">Connected microservices</h3>
        <p className="text-muted-foreground mt-1 text-[11px]">
          {services.length} services directly downstream of {node.data.label}. Increase the count to
          add editable services and their routes. Each service keeps its own replica settings.
        </p>
      </div>
      {parents.length > 0 && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-[11px]">
            {node.type === "microservice"
              ? "To expand this service’s peers, select its upstream:"
              : "For services behind your limiter, manage that group:"}
          </p>
          {parents.map((parent) => (
            <Button
              key={parent.id}
              size="sm"
              variant="outline"
              className="mr-1 max-w-full truncate"
              onClick={() => document.selectNodes([parent.id])}
            >
              Manage group at {parent.data.label}
            </Button>
          ))}
        </div>
      )}
      <label htmlFor={`${nodeId}-service-count`} className="block text-xs">
        Service count
      </label>
      <Input
        id={`${nodeId}-service-count`}
        type="number"
        min={0}
        max={MAX_SERVICE_COUNT}
        step={1}
        className="h-8"
        value={value}
        aria-invalid={!valid}
        onChange={(e) => {
          setRequested(e.target.value);
          setConfirmed("");
        }}
      />
      {!valid && (
        <p className="text-destructive text-xs">
          Enter a whole number from 0 to {MAX_SERVICE_COUNT}.
        </p>
      )}
      {plan && plan.addedIds.length > 0 && (
        <p className="text-muted-foreground text-[11px]">
          Adds {plan.addedIds.length} services, each with a route from this component and an
          editable API scaffold. Existing services and their connections stay in place.
        </p>
      )}
      {plan && plan.removed.length > 0 && (
        <div className="space-y-2 text-xs">
          <p>Remove: {plan.removed.map((n) => `${n.data.label} (${n.id})`).join(", ")}.</p>
          <p className="text-muted-foreground">
            This removes {plan.removedEdges.length} connections, including any links to other
            components, and {plan.removedApis.length} owned APIs. State definitions are kept and
            missing component references are cleared. Undo restores everything.
          </p>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={confirmed === impact}
              onChange={(e) => setConfirmed(e.target.checked ? impact : "")}
            />
            Remove these services and their connections
          </label>
        </div>
      )}
      <Button
        size="sm"
        variant="outline"
        className="w-full"
        disabled={!plan || (plan.removed.length > 0 && confirmed !== impact)}
        onClick={() => {
          if (!plan) return;
          if (
            !document.setServiceCount(
              nodeId,
              count,
              plan.removed.length > 0 && confirmed === impact,
            )
          )
            return;
          setRequested(null);
          setConfirmed("");
          const ids = [
            nodeId,
            ...connectedMicroservices(useWorkspaceStore.getState(), nodeId).map((n) => n.id),
          ];
          requestAnimationFrame(
            () => void fitView({ nodes: ids.map((id) => ({ id })), padding: 0.25, maxZoom: 1 }),
          );
          toast.success(`Service group updated to ${count}. Undo restores the previous design.`);
        }}
      >
        Apply service count
      </Button>
    </section>
  );
}
