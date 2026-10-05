"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { ArrowLeft, BookOpen, Loader2, Lock, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { SaveStatus } from "@/lib/persistence/autosaver";
import type { Problem, Stage } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { isReadOnly, useAttemptStore } from "@/store/attempt";
import { ShortcutsButton } from "@/components/app/ShortcutsDialog";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { useShortcuts } from "@/components/useShortcuts";
import { STAGES } from "@/lib/workspace/stages";
import { runTestsNow } from "./actions";
import { ProblemPanel } from "./ProblemPanel";
import { StageStepper } from "./StageStepper";
import { Apis } from "./stages/Apis";
import { Design } from "./stages/Design";
import { Entities } from "./stages/Entities";
import { Estimation } from "./stages/Estimation";
import { Requirements } from "./stages/Requirements";
import { Review } from "./stages/Review";
import { Timer } from "./Timer";
import { NEW_ATTEMPT, useAttemptPersistence } from "./useAttemptPersistence";

const STATUS_TEXT: Record<SaveStatus, string> = {
  loading: "Loading...",
  pending: "Saving...",
  saved: "Saved",
  error: "Save failed",
};

function initialAttemptParam(): string | null {
  return new URLSearchParams(window.location.search).get("attempt");
}

export function ProblemWorkspace({ problem }: { problem: Problem }) {
  // Read once: the persistence hook rewrites ?attempt= itself.
  const [requested, setRequested] = useState(initialAttemptParam);
  return (
    <ReactFlowProvider>
      <Workspace
        key={requested ?? ""}
        problem={problem}
        requested={requested}
        onNewAttempt={() => setRequested(`${NEW_ATTEMPT}:${Date.now()}`)}
      />
    </ReactFlowProvider>
  );
}

type Props = { problem: Problem; requested: string | null; onNewAttempt: () => void };

function Workspace({ problem, requested, onNewAttempt }: Props) {
  const status = useAttemptPersistence(
    problem,
    requested?.startsWith(NEW_ATTEMPT) ? NEW_ATTEMPT : requested,
  );
  const meta = useAttemptStore((s) => s.meta);
  const stage = meta?.stage ?? "requirements";
  const readOnly = isReadOnly(meta);
  const loading = status === "loading" || !meta || meta.problemId !== problem.id;
  const [panelOpen, setPanelOpen] = useState(true);
  useShortcuts(
    {
      ...Object.fromEntries(
        STAGES.map((st, i) => [`stage-${i + 1}`, () => useAttemptStore.getState().setStage(st.id)]),
      ),
      panel: () => setPanelOpen((o) => !o),
      timer: () => useAttemptStore.getState().toggleTimerPaused(),
      tests: () => runTestsNow(problem),
    },
    !loading,
  );

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b px-3">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="truncate text-sm font-semibold">{problem.title}</h1>
        <Button
          variant={panelOpen ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setPanelOpen((o) => !o)}
          aria-pressed={panelOpen}
        >
          <BookOpen /> Problem
        </Button>
        <div className="mx-auto">{!loading && <StageStepper />}</div>
        {readOnly && (
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <Lock className="size-3" /> Submitted
          </span>
        )}
        {!loading && <Timer />}
        <span
          className={cn(
            "w-16 text-right text-xs",
            status === "error" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {STATUS_TEXT[status]}
        </span>
        <Button variant="outline" size="sm" onClick={onNewAttempt}>
          <Plus /> New attempt
        </Button>
        <ShortcutsButton />
        <ThemeToggle />
      </header>

      <div className="flex min-h-0 flex-1">
        {panelOpen && (
          <aside className="w-80 shrink-0 overflow-y-auto border-r">
            <ProblemPanel problem={problem} />
          </aside>
        )}
        <main className="min-w-0 flex-1">
          {loading ? (
            <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" /> Loading attempt...
            </div>
          ) : (
            <StageView stage={stage} problem={problem} readOnly={readOnly} />
          )}
        </main>
      </div>
    </div>
  );
}

function StageView({
  stage,
  problem,
  readOnly,
}: {
  stage: Stage;
  problem: Problem;
  readOnly: boolean;
}) {
  if (stage === "design") return <Design readOnly={readOnly} fileBase={problem.id} />;

  const forms: Record<Exclude<Stage, "design">, React.ReactNode> = {
    requirements: <Requirements />,
    estimation: <Estimation />,
    data_model: <Entities />,
    apis: <Apis />,
    review: <Review problem={problem} />,
  };
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl p-6">
        {/* Review stays interactive (hint toggle); its own buttons respect the submitted state. */}
        <fieldset disabled={readOnly && stage !== "review"} className="min-w-0">
          {forms[stage]}
        </fieldset>
      </div>
    </div>
  );
}
