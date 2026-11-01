"use client";

import { AccountMenu } from "@/components/auth/AccountMenu";
import { ReactFlowProvider } from "@xyflow/react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Canvas } from "@/components/canvas/Canvas";
import { InspectorPanel } from "@/components/canvas/InspectorPanel";
import { Palette } from "@/components/canvas/Palette";
import { Toolbar } from "@/components/canvas/Toolbar";
import { useAddNode } from "@/components/canvas/useAddNode";
import { ShortcutsButton } from "@/components/app/ShortcutsDialog";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { LintDrawer } from "@/components/lint/LintDrawer";
import { useSandboxPersistence, type SaveStatus } from "@/components/canvas/useSandboxPersistence";
import { ensureSandbox, listSandboxes, type SandboxSummary } from "@/lib/db/sandboxes";
import { usePreferences } from "@/store/preferences";
import { SandboxTabs } from "./SandboxTabs";

const STATUS_TEXT: Record<SaveStatus, string> = {
  loading: "Loading...",
  pending: "Unsaved changes",
  saved: "Saved locally",
  error: "Save failed",
};

export function SandboxWorkspace() {
  const tabs = useLiveQuery(listSandboxes);
  const lastId = usePreferences((s) => s.lastSandboxId);
  const select = (id: string) => usePreferences.getState().set({ lastSandboxId: id });

  useEffect(() => {
    void ensureSandbox();
  }, []);

  const active = tabs?.find((t) => t.id === lastId) ?? tabs?.[0];
  if (!tabs || !active) {
    return (
      <div className="text-muted-foreground flex h-screen items-center justify-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" /> Loading sandboxes...
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <SandboxLayout tabs={tabs} active={active} onSelect={select} />
    </ReactFlowProvider>
  );
}

/** Export file name for a sandbox, e.g. "My Design" -> "sandbox-my-design". */
const fileBase = (name: string) =>
  ["sandbox", ...(name.toLowerCase().match(/[a-z0-9]+/g) ?? [])].join("-");

type LayoutProps = {
  tabs: SandboxSummary[];
  active: SandboxSummary;
  onSelect: (id: string) => void;
};

function SandboxLayout({ tabs, active, onSelect }: LayoutProps) {
  const status = useSandboxPersistence(active.id);
  const { addAtCenter } = useAddNode();

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-3">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" />
          Home
        </Link>
        <h1 className="text-sm font-semibold">Sandbox</h1>
        <div className="mx-auto">
          <Toolbar fileBase={fileBase(active.name)} />
        </div>
        <span
          className={
            status === "error" ? "text-destructive text-xs" : "text-muted-foreground text-xs"
          }
        >
          {STATUS_TEXT[status]}
        </span>
        <AccountMenu />
        <ShortcutsButton />
        <ThemeToggle />
      </header>

      <SandboxTabs tabs={tabs} activeId={active.id} onSelect={onSelect} />

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 border-r">
          <Palette onAdd={addAtCenter} />
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          {status === "loading" ? (
            <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading canvas...
            </div>
          ) : (
            <>
              <div className="relative min-h-0 flex-1">
                <Canvas />
              </div>
              <LintDrawer />
            </>
          )}
        </main>
        <aside className="w-80 shrink-0 border-l">
          <InspectorPanel />
        </aside>
      </div>
    </div>
  );
}
