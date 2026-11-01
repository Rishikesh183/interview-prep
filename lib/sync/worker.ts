"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { liveQuery, type Subscription } from "dexie";
import { create } from "zustand";
import { db } from "@/lib/db/dexie";
import { SyncEngine } from "./engine";
import { supabaseRemote } from "./supabaseRemote";

/**
 * Background sync for compact progress and explicitly saved solutions only.
 * Drafts, full attempts and history are local-only and never trigger network writes.
 */

export const PUSH_DEBOUNCE_MS = 5000;

export type SyncStatus = "off" | "syncing" | "synced" | "error" | "offline";

export const useSyncStatus = create<{
  status: SyncStatus;
  lastSyncedAt: number | null;
  error: string | null;
}>()(() => ({ status: "off", lastSyncedAt: null, error: null }));

let engine: SyncEngine | null = null;
let queue: Promise<unknown> = Promise.resolve();
let initial: Promise<void> = Promise.resolve();
let timer: ReturnType<typeof setTimeout> | undefined;
let subscription: Subscription | undefined;
let detach: (() => void) | undefined;

/** Runs sync jobs one at a time and reflects the outcome in the status store. */
function run(job: (e: SyncEngine) => Promise<unknown>): Promise<void> {
  const current = engine;
  if (!current) return Promise.resolve();
  const next = queue.then(async () => {
    if (engine !== current) return; // signed out / switched account meanwhile
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      useSyncStatus.setState({ status: "offline" });
      return;
    }
    useSyncStatus.setState({ status: "syncing", error: null });
    try {
      await job(current);
      useSyncStatus.setState({ status: "synced", lastSyncedAt: Date.now() });
    } catch (err) {
      useSyncStatus.setState({
        status: "error",
        error: err instanceof Error ? err.message : "Sync failed",
      });
    }
  });
  queue = next;
  return next;
}

export const syncNow = () => run((e) => e.syncAll());
const pushNow = () => {
  clearTimeout(timer);
  timer = undefined;
  return run((e) => e.pushDirty());
};

/** Watch only cloud-backed records; local history must not trigger network traffic. */
async function dirtySummary() {
  const [progress, solutions] = await Promise.all([
    db().progress.toArray(),
    db().mySolutions.toArray(),
  ]);
  const progressDirty = progress.filter((p) => (p.pushedAt ?? -1) < p.updatedAt).length;
  const solutionsDirty = solutions.filter(
    (s) => s.deletedAt !== undefined || (s.pushedAt ?? -1) < s.updatedAt,
  ).length;
  return { count: progressDirty + solutionsDirty, progressChanged: progressDirty > 0 };
}

export function startSync(client: SupabaseClient, userId: string): void {
  stopSync();
  engine = new SyncEngine(supabaseRemote(client), userId);
  initial = run(async (e) => {
    await e.bindUser();
    await e.syncAll();
  });

  subscription = liveQuery(dirtySummary).subscribe({
    next: ({ count, progressChanged }) => {
      if (!count) return;
      if (progressChanged) void pushNow();
      else {
        clearTimeout(timer);
        timer = setTimeout(() => void pushNow(), PUSH_DEBOUNCE_MS);
      }
    },
  });

  const onVisibility = () => {
    // Leaving: push what we have. Coming back: pick up edits made on other devices.
    if (document.visibilityState === "hidden") void pushNow();
    else void syncNow();
  };
  const onOnline = () => void syncNow();
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("online", onOnline);
  detach = () => {
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("online", onOnline);
  };
}

export function stopSync(): void {
  clearTimeout(timer);
  timer = undefined;
  subscription?.unsubscribe();
  subscription = undefined;
  detach?.();
  detach = undefined;
  engine = null;
  initial = Promise.resolve();
  useSyncStatus.setState({ status: "off", error: null });
}

/**
 * Lets a page wait (briefly) for best-progress sync after sign-in before computing
 * solution-unlock and early-peek rules. Attempts themselves are never pulled. Never blocks longer than `timeoutMs`.
 */
export function waitForInitialSync(timeoutMs = 4000): Promise<void> {
  return Promise.race([initial, new Promise<void>((r) => setTimeout(r, timeoutMs))]);
}
