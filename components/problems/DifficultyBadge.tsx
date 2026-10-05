import type { Difficulty } from "@/lib/schema";
import { cn } from "@/lib/utils";

const STYLES: Record<Difficulty, string> = {
  easy: "text-emerald-700 bg-emerald-500/10 dark:text-emerald-400",
  medium: "text-amber-700 bg-amber-500/10 dark:text-amber-400",
  hard: "text-rose-700 bg-rose-500/10 dark:text-rose-400",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={cn("rounded px-1.5 py-0.5 text-xs font-medium capitalize", STYLES[difficulty])}
    >
      {difficulty}
    </span>
  );
}
