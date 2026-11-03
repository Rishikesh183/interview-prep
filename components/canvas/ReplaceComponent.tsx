"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SimpleSelect } from "@/components/form/SimpleSelect";
import { CATALOG } from "@/lib/catalog/components";
import { planReplacement } from "@/lib/graph/replacement";
import { useWorkspaceStore } from "@/store/workspace";

export function ReplaceComponent({ nodeId }: { nodeId: string }) {
  const [open, setOpen] = useState(false),
    [type, setType] = useState<string>(),
    [removeApis, setRemoveApis] = useState(false);
  const document = useWorkspaceStore();
  const node = document.nodes.find((n) => n.id === nodeId);
  if (!node || CATALOG[node.type ?? ""]?.category === "annotation") return null;
  const plan = type ? planReplacement(document, nodeId, type) : null;
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Replace component"
        aria-label="Replace component"
        onClick={() => {
          setOpen(true);
          setType(undefined);
          setRemoveApis(false);
        }}
      >
        <ArrowLeftRight />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Replace {node.data.label}</DialogTitle>
            <DialogDescription>
              Keep this node’s position, identity, notes and connections. Review ownership and
              protocol changes before applying. Undo restores the complete design.
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="replacement-type" className="text-sm font-medium">
            Replace with
          </label>
          <SimpleSelect
            id="replacement-type"
            value={type}
            placeholder="Choose a component"
            options={Object.values(CATALOG)
              .filter((d) => d.category !== "annotation" && d.type !== node.type)
              .map((d) => ({ value: d.type, label: d.label }))}
            onChange={(v) => {
              setType(v);
              setRemoveApis(false);
            }}
          />
          {plan && (
            <div className="space-y-3 text-sm">
              <p>
                {plan.connections} connections kept. {plan.protocolsChanged} default protocol/mode
                settings updated for the new type.
              </p>
              {plan.customProtocols > 0 && (
                <p className="text-muted-foreground">
                  {plan.customProtocols} custom protocol settings are preserved; review their
                  compatibility after replacement.
                </p>
              )}
              {plan.detachedEntities.length > 0 && (
                <p>
                  State definitions are kept, but these incompatible owner assignments will be
                  cleared: {plan.detachedEntities.join(", ")}.
                </p>
              )}
              {plan.clearedReferences.length > 0 && (
                <p>
                  Incompatible component references will be cleared:{" "}
                  {plan.clearedReferences.join(", ")}.
                </p>
              )}
              {plan.removedApis.length > 0 && (
                <label className="flex items-start gap-2 rounded border p-3">
                  <input
                    type="checkbox"
                    checked={removeApis}
                    onChange={(e) => setRemoveApis(e.target.checked)}
                  />
                  <span>
                    Remove {plan.removedApis.length} incompatible API definitions (
                    {plan.removedApis.map((a) => a.path || a.id).join(", ")}) and unlink their edge
                    contracts. Undo restores them.
                  </span>
                </label>
              )}
              <p className="text-muted-foreground text-xs">
                Compatible configuration fields are retained; other fields use the new component’s
                defaults. Custom labels and notes are retained.
              </p>
            </div>
          )}
          <Button
            disabled={!plan || (plan.removedApis.length > 0 && !removeApis)}
            onClick={() => {
              if (type && document.replaceNode(nodeId, type, removeApis)) {
                setOpen(false);
                toast.success(
                  "Component replaced. Connections kept; undo restores the previous design.",
                );
              }
            }}
          >
            Replace component
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
