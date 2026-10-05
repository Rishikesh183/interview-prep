"use client";

import dynamic from "next/dynamic";

/** Canvas + IndexedDB are browser-only, so skip SSR entirely. */
export const SandboxClient = dynamic(
  () => import("@/components/sandbox/SandboxWorkspace").then((m) => m.SandboxWorkspace),
  { ssr: false },
);
