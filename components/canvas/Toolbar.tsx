"use client";

import { useReactFlow } from "@xyflow/react";
import { Copy, Eraser, FileDown, FileUp, ImageDown, Redo2, Trash2, Undo2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { buildExport, parseImport } from "@/lib/graph/importExport";
import { useHistory, useWorkspaceStore } from "@/store/workspace";
import { downloadJson, downloadPng } from "./exporters";

type ToolProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
};

function Tool({ label, onClick, disabled, children }: ToolProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

type Props = {
  fileBase?: string;
  /** Only the export tools are shown. */
  readOnly?: boolean;
};

export function Toolbar({ fileBase = "design", readOnly = false }: Props) {
  const { undo, redo, canUndo, canRedo } = useHistory();
  const hasSelection = useWorkspaceStore(
    (s) => s.nodes.some((n) => n.selected) || s.edges.some((e) => e.selected),
  );
  const isEmpty = useWorkspaceStore((s) => s.nodes.length === 0);
  const duplicateSelected = useWorkspaceStore((s) => s.duplicateSelected);
  const deleteSelected = useWorkspaceStore((s) => s.deleteSelected);
  const { getNodes, fitView } = useReactFlow();
  const fileInput = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const s = useWorkspaceStore.getState();
    downloadJson(buildExport(s.getGraph(), s.apis), `${fileBase}.json`);
  };

  const exportPng = async () => {
    try {
      await downloadPng(getNodes(), `${fileBase}.png`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PNG export failed.");
    }
  };

  const importJson = async (file: File) => {
    const result = parseImport(await file.text());
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const s = useWorkspaceStore.getState();
    s.setGraph(result.graph);
    s.setApis(result.apis);
    toast.success(`Imported ${result.graph.nodes.length} nodes. Ctrl+Z to undo.`);
    requestAnimationFrame(() => void fitView({ padding: 0.2 }));
  };

  const clear = () => {
    if (!window.confirm("Clear the whole canvas? You can undo with Ctrl+Z.")) return;
    const s = useWorkspaceStore.getState();
    s.setGraph({ nodes: [], edges: [] });
    s.setApis([]);
  };

  return (
    <div className="flex items-center gap-0.5">
      {!readOnly && (
        <>
          <Tool label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
            <Undo2 />
          </Tool>
          <Tool label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}>
            <Redo2 />
          </Tool>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <Tool label="Duplicate (Ctrl+D)" onClick={duplicateSelected} disabled={!hasSelection}>
            <Copy />
          </Tool>
          <Tool label="Delete selected (Del)" onClick={deleteSelected} disabled={!hasSelection}>
            <Trash2 />
          </Tool>
          <Tool label="Clear canvas" onClick={clear} disabled={isEmpty}>
            <Eraser />
          </Tool>
          <Separator orientation="vertical" className="mx-1 h-5" />
        </>
      )}
      <Tool label="Export PNG" onClick={() => void exportPng()} disabled={isEmpty}>
        <ImageDown />
      </Tool>
      <Tool label="Export JSON" onClick={exportJson}>
        <FileDown />
      </Tool>
      {!readOnly && (
        <Tool label="Import JSON" onClick={() => fileInput.current?.click()}>
          <FileUp />
        </Tool>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void importJson(file);
        }}
      />
    </div>
  );
}
