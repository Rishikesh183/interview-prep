import type { Category } from "@/lib/schema";

/** Full class strings so Tailwind can see them. */
export const CATEGORY_STYLES: Record<Category, { icon: string; accent: string }> = {
  clients: {
    icon: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
    accent: "border-l-slate-500",
  },
  edge: { icon: "bg-sky-500/15 text-sky-700 dark:text-sky-300", accent: "border-l-sky-500" },
  compute: {
    icon: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    accent: "border-l-violet-500",
  },
  storage: {
    icon: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    accent: "border-l-emerald-500",
  },
  messaging: {
    icon: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    accent: "border-l-amber-500",
  },
  infra: { icon: "bg-rose-500/15 text-rose-700 dark:text-rose-300", accent: "border-l-rose-500" },
  annotation: {
    icon: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
    accent: "border-l-yellow-500",
  },
};
