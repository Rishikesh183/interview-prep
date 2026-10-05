"use client";

import { AccountMenu } from "@/components/auth/AccountMenu";
import { ReactFlowProvider } from "@xyflow/react";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Canvas } from "@/components/canvas/Canvas";
import { InspectorPanel } from "@/components/canvas/InspectorPanel";
import { Palette } from "@/components/canvas/Palette";
import { Toolbar } from "@/components/canvas/Toolbar";
import { useAddNode } from "@/components/canvas/useAddNode";
import { ShortcutsButton } from "@/components/app/ShortcutsDialog";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { LintDrawer } from "@/components/lint/LintDrawer";
import { useSandboxPersistence, type SaveStatus } from "@/components/canvas/useSandboxPersistence";

const STATUS_TEXT: Record<SaveStatus, string> = {
  loading: "Loading...",
  pending: "Unsaved changes",
  saved: "Saved locally",
  error: "Save failed",
};

export function SandboxWorkspace() {
  return (
    <ReactFlowProvider>
      <SandboxLayout />
    </ReactFlowProvider>
  );
}

function SandboxLayout() {
  const status = useSandboxPersistence();
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
          <Toolbar fileBase="sandbox" />
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
