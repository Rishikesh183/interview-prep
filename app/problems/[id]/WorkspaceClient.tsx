"use client";

import dynamic from "next/dynamic";

/** Canvas + IndexedDB + URL handling are browser-only, so skip SSR entirely. */
export const WorkspaceClient = dynamic(
  () => import("@/components/workspace/ProblemWorkspace").then((m) => m.ProblemWorkspace),
  { ssr: false },
);
