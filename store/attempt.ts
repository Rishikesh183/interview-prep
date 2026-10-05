import { create } from "zustand";
import { estimate } from "@/lib/estimation/calc";
import {
  EstimationInputSchema,
  type Attempt,
  type AiReview,
  type Entity,
  type FollowUp,
  type Estimation,
  type Requirements,
  type Stage,
  type TestRun,
} from "@/lib/schema";
import { lintContext, type LintProblem } from "@/lib/lint/context";
import { runLint } from "@/lib/lint";
import { usePreferences } from "./preferences";
import { resetHistory, useWorkspaceStore } from "./workspace";

/** Everything in an attempt except the canvas (graph + APIs), which lives in the workspace store. */
export type AttemptMeta = Omit<Attempt, "graph" | "apis">;

type AttemptState = {
  meta: AttemptMeta | null;
  /** True for a never-saved attempt until the user edits something; the clock waits for that. */
  pristine: boolean;
  /** What the linter needs from the problem being attempted. */
  problem: LintProblem | null;
  load: (attempt: Attempt, opts?: { pristine?: boolean; problem?: LintProblem }) => void;
  /** Forget any loaded attempt (e.g. when entering the sandbox). */
  clear: () => void;
  setStage: (stage: Stage) => void;
  setRequirements: (key: keyof Requirements, lines: string[]) => void;
  setEstimation: (patch: Partial<Estimation>) => void;
  setEntities: (entities: Entity[]) => void;
  setTimerLimit: (minutes: number | null) => void;
  toggleTimerPaused: () => void;
  addElapsed: (ms: number) => void;
  revealHint: () => void;
  setTestRun: (run: TestRun) => void;
  submit: () => void;
  setReview: (review: AiReview) => void;
  addFollowUp: (followUp: FollowUp) => void;
};

export const useAttemptStore = create<AttemptState>()((set, get) => {
  const patch = (p: Partial<AttemptMeta>) => {
    const meta = get().meta;
    if (meta) set({ meta: { ...meta, ...p }, pristine: false });
  };

  return {
    meta: null,
    pristine: false,
    problem: null,

    load: (attempt, { pristine = false, problem } = {}) => {
      const { graph, apis, ...meta } = attempt;
      const ws = useWorkspaceStore.getState();
      ws.setGraph(graph);
      ws.setApis(apis);
      resetHistory();
      set({ meta, pristine, problem: problem ?? null });
    },
    clear: () => set({ meta: null, pristine: false, problem: null }),

    setStage: (stage) => patch({ stage }),
    setRequirements: (key, lines) => {
      const meta = get().meta;
      if (meta) patch({ requirements: { ...meta.requirements, [key]: lines } });
    },
    setEstimation: (p) => {
      const meta = get().meta;
      if (meta) patch({ estimation: { ...meta.estimation, ...p } });
    },
    setEntities: (entities) => patch({ entities }),
    setTimerLimit: (timerLimitMin) => patch({ timerLimitMin }),
    toggleTimerPaused: () => {
      const meta = get().meta;
      if (meta) patch({ timerPaused: !meta.timerPaused });
    },
    addElapsed: (ms) => {
      const { meta, pristine } = get();
      if (!meta || meta.status !== "in_progress" || meta.timerPaused) return;
      if (pristine) {
        const ws = useWorkspaceStore.getState();
        if (ws.nodes.length === 0 && ws.apis.length === 0) return;
      }
      patch({ elapsedMs: meta.elapsedMs + ms });
    },
    revealHint: () => {
      const meta = get().meta;
      if (meta) patch({ hintsRevealed: meta.hintsRevealed + 1 });
    },
    setTestRun: (testRun) => patch({ testRun }),
    submit: () => {
      const meta = get().meta;
      if (!meta || meta.status !== "in_progress") return;
      patch({
        status: "submitted",
        submittedAt: Date.now(),
        durationSec: Math.round(meta.elapsedMs / 1000),
      });
    },
    // Reviews and follow-ups are allowed on submitted (read-only) attempts.
    setReview: (review) => patch({ review, status: "reviewed" }),
    addFollowUp: (followUp) => {
      const meta = get().meta;
      if (meta) patch({ followUps: [...meta.followUps, followUp] });
    },
  };
});

/** Full attempt snapshot for saving: meta + canvas, with estimation outputs and lint computed. */
export function snapshotAttempt(): Attempt | null {
  const { meta, problem } = useAttemptStore.getState();
  if (!meta) return null;
  const ws = useWorkspaceStore.getState();
  const graph = ws.getGraph();
  const estimation = EstimationInputSchema.parse(meta.estimation);
  const lint = runLint(
    lintContext({
      graph,
      apis: ws.apis,
      estimation: meta.estimation,
      requirements: meta.requirements,
      problem,
      keyComponentHints: usePreferences.getState().keyComponentHints,
    }),
  );
  return {
    ...meta,
    estimation: { ...meta.estimation, outputs: estimate(estimation) },
    graph,
    apis: ws.apis,
    lint,
  };
}

export const isReadOnly = (meta: AttemptMeta | null) =>
  meta !== null && meta.status !== "in_progress";
