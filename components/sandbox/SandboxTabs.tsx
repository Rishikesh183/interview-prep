"use client";

import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  createSandbox,
  deleteSandbox,
  MAX_SANDBOXES,
  renameSandbox,
  type SandboxSummary,
} from "@/lib/db/sandboxes";
import { cn } from "@/lib/utils";

type Props = {
  tabs: SandboxSummary[];
  activeId: string;
  onSelect: (id: string) => void;
};

/** One tab per sandbox: click to switch, double-click to rename, x to delete. */
export function SandboxTabs({ tabs, activeId, onSelect }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const atLimit = tabs.length >= MAX_SANDBOXES;

  const onAdd = async () => {
    try {
      const created = await createSandbox();
      onSelect(created.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't create a sandbox");
    }
  };

  const onDelete = async (tab: SandboxSummary) => {
    if (!window.confirm(`Delete "${tab.name}"? This cannot be undone.`)) return;
    if (tab.id === activeId) {
      const i = tabs.findIndex((t) => t.id === tab.id);
      const next = tabs[i + 1] ?? tabs[i - 1];
      if (next) onSelect(next.id);
    }
    await deleteSandbox(tab.id);
  };

  return (
    <div role="tablist" className="bg-muted/40 flex h-9 shrink-0 items-end gap-1 border-b px-2">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <div
            key={tab.id}
            className={cn(
              "group flex h-8 max-w-48 items-center gap-1 rounded-t-md border border-b-0 px-2 text-xs",
              active
                ? "bg-background text-foreground -mb-px"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {editing === tab.id ? (
              <RenameInput
                initial={tab.name}
                onDone={(name) => {
                  setEditing(null);
                  if (name !== null && name !== tab.name) void renameSandbox(tab.id, name);
                }}
              />
            ) : (
              <button
                role="tab"
                aria-selected={active}
                className="truncate"
                title={`${tab.name} (double-click to rename)`}
                onClick={() => onSelect(tab.id)}
                onDoubleClick={() => setEditing(tab.id)}
              >
                {tab.name}
              </button>
            )}
            {tabs.length > 1 && editing !== tab.id && (
              <button
                aria-label={`Delete ${tab.name}`}
                className={cn(
                  "hover:bg-muted rounded p-0.5",
                  active ? "opacity-70" : "opacity-0 group-hover:opacity-70",
                )}
                onClick={() => void onDelete(tab)}
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        );
      })}
      <Button
        variant="ghost"
        size="icon-sm"
        className="mb-0.5"
        aria-label="New sandbox"
        title={atLimit ? `Limit of ${MAX_SANDBOXES} sandboxes reached` : "New sandbox"}
        disabled={atLimit}
        onClick={() => void onAdd()}
      >
        <Plus />
      </Button>
      <span className="text-muted-foreground mb-2 ml-1 text-xs">
        {tabs.length}/{MAX_SANDBOXES}
      </span>
    </div>
  );
}

/** Enter or blur saves, Escape cancels (reports null). */
function RenameInput({
  initial,
  onDone,
}: {
  initial: string;
  onDone: (name: string | null) => void;
}) {
  const [value, setValue] = useState(initial);
  // Removing the input can fire a late blur; report only once.
  const done = useRef(false);
  const finish = (name: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(name);
  };
  return (
    <input
      autoFocus
      aria-label="Sandbox name"
      maxLength={40}
      className="bg-background w-32 rounded border px-1 text-xs outline-none"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          e.preventDefault();
          finish(null);
        }
      }}
    />
  );
}
