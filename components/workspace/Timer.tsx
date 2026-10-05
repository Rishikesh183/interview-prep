"use client";

import { Pause, Play, Timer as TimerIcon } from "lucide-react";
import { useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/attempts/status";
import { cn } from "@/lib/utils";
import { useAttemptStore } from "@/store/attempt";

const TICK_MS = 1000;
const LIMITS = [
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
  { value: "none", label: "No limit (stopwatch)" },
];

/** Counts active time only (tab visible, attempt in progress). Shows a countdown when a limit is set. */
export function Timer() {
  const elapsedMs = useAttemptStore((s) => s.meta?.elapsedMs ?? 0);
  const limitMin = useAttemptStore((s) => s.meta?.timerLimitMin ?? null);
  const running = useAttemptStore((s) => s.meta?.status === "in_progress");
  const pristine = useAttemptStore((s) => s.pristine);
  const paused = useAttemptStore((s) => s.meta?.timerPaused ?? false);
  const setTimerLimit = useAttemptStore((s) => s.setTimerLimit);
  const togglePaused = useAttemptStore((s) => s.toggleTimerPaused);

  useEffect(() => {
    if (!running || paused) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        useAttemptStore.getState().addElapsed(TICK_MS);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, paused]);

  const remaining = limitMin === null ? null : limitMin * 60_000 - elapsedMs;
  const overtime = remaining !== null && remaining < 0;
  const text =
    remaining === null
      ? formatDuration(elapsedMs)
      : overtime
        ? `+${formatDuration(-remaining)}`
        : formatDuration(remaining);

  return (
    <div className="flex items-center">
      {running && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={togglePaused}
          aria-label={paused ? "Resume timer (Alt+T)" : "Pause timer (Alt+T)"}
          title={paused ? "Resume timer (Alt+T)" : "Pause timer (Alt+T)"}
        >
          {paused ? <Play /> : <Pause />}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "hover:bg-accent flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-sm tabular-nums",
            overtime && "text-destructive",
            (!running || paused) && "text-muted-foreground",
            paused && running && "animate-pulse",
          )}
          title={
            paused
              ? "Paused"
              : pristine && elapsedMs === 0
                ? "Starts with your first edit"
                : "Interview timer"
          }
        >
          <TimerIcon className="size-4" />
          {text}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuRadioGroup
            value={limitMin === null ? "none" : String(limitMin)}
            onValueChange={(v) => setTimerLimit(v === "none" ? null : Number(v))}
          >
            {LIMITS.map((l) => (
              <DropdownMenuRadioItem key={l.value} value={l.value}>
                {l.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
