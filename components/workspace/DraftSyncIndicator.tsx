"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/useAuth";
import { db } from "@/lib/db/dexie";
import { draftKey, acceptCloudDraft, keepDeviceDraft, attemptFromDraft } from "@/lib/db/drafts";
import { saveAttempt } from "@/lib/db/attempts";
import { useSyncStatus, syncNow } from "@/lib/sync/worker";
import { snapshotAttempt, useAttemptStore } from "@/store/attempt";
import type { Problem } from "@/lib/schema";

export function DraftSyncIndicator({
  problem,
  onResume,
}: {
  problem: Problem;
  onResume: (attemptId: string) => void;
}) {
  const auth = useAuth(),
    sync = useSyncStatus();
  const userId = auth.status === "signed-in" ? auth.user?.id : undefined;
  const row = useLiveQuery(
    () => (userId ? db().drafts.get(draftKey(userId, problem.id)) : undefined),
    [userId, problem.id],
  );
  const [busy, setBusy] = useState(false);
  const owner = useAttemptStore((s) => s.meta?.ownerUserId);
  const resolve = async (cloud: boolean) => {
    if (!userId || busy) return;
    setBusy(true);
    try {
      const current = snapshotAttempt();
      if (current?.problemId === problem.id) await saveAttempt(current, userId);
      if (useAuth.getState().user?.id !== userId)
        throw new Error("Your account changed. Reopen the draft.");
      if (cloud) {
        const latest = await acceptCloudDraft(userId, problem.id);
        if (!latest) return;
        const attempt = attemptFromDraft(latest);
        await db().attempts.put(attempt);
        await db().drafts.update(latest.id, { linkedAttemptId: attempt.id });
        if (useAuth.getState().user?.id !== userId)
          throw new Error("Your account changed. Reopen the draft.");
        useAttemptStore.getState().load(attempt, { problem });
        onResume(attempt.id);
        toast.success("Cloud design loaded. Your previous local copy stays in History.");
      } else {
        const latest = await db().drafts.get(draftKey(userId, problem.id));
        if (latest?.remote)
          await db().attempts.put(attemptFromDraft({ ...latest, content: latest.remote.content }));
        await keepDeviceDraft(userId, problem.id);
        await syncNow();
        toast.success("Device design kept. The cloud version was preserved in local History.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Draft sync failed");
    } finally {
      setBusy(false);
    }
  };
  if (!userId)
    return (
      <span
        className="text-muted-foreground flex items-center gap-1 text-[11px]"
        title="Sign in to sync current HLD drafts between devices"
      >
        <CloudOff className="size-3" /> Local draft
      </span>
    );
  if (owner && owner !== userId)
    return (
      <span className="text-xs text-amber-600">
        Local copy belongs to another account. Start a new attempt to sync here.
      </span>
    );
  const unseen = row && !row.linkedAttemptId && !row.dirty;
  if (row?.remote || unseen)
    return (
      <div
        className="flex flex-wrap items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs"
        role="status"
      >
        <Cloud className="size-4" />
        <span>
          {row.dirty
            ? "Both devices changed this design. Choose the version to continue."
            : "A cloud design is ready to load."}
        </span>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void resolve(true)}>
          Use cloud design
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void resolve(false)}>
          Keep this device
        </Button>
      </div>
    );
  return (
    <span
      className="text-muted-foreground flex items-center gap-1 text-[11px]"
      title={
        sync.error ?? "One latest editable HLD per question is synced; full history stays local."
      }
    >
      {sync.status === "error" || sync.status === "offline" ? (
        <CloudOff className="size-3" />
      ) : (
        <Cloud className="size-3" />
      )}
      {sync.status === "error"
        ? "Cloud sync failed"
        : sync.status === "offline"
          ? "Saved locally · offline"
          : row?.dirty
            ? "Cloud sync pending"
            : row
              ? "Cloud draft synced"
              : "Cloud draft saves after your first edit"}
      {sync.status === "error" && (
        <button aria-label="Retry draft sync" onClick={() => void syncNow()}>
          <RefreshCw className="size-3" />
        </button>
      )}
    </span>
  );
}
