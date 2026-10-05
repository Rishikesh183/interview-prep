"use client";

import dynamic from "next/dynamic";

/** The lock depends on attempts in IndexedDB, so render in the browser only. */
export const SolutionsClient = dynamic(
  () => import("@/components/solutions/SolutionsView").then((m) => m.SolutionsView),
  { ssr: false },
);
