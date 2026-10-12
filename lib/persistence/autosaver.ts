export type SaveStatus = "loading" | "saved" | "pending" | "error";

type Options<T> = {
  snapshot: () => T | null;
  save: (value: T) => Promise<void>;
  onStatus: (status: SaveStatus) => void;
  /** Quiet period before saving. */
  delayMs?: number;
  /** Save at least this often while changes keep coming. */
  maxWaitMs?: number;
  /**
   * How often bursts of store changes are inspected. `schedule()` itself does no work beyond
   * arming a timer, so keystrokes and drags don't each serialize the whole snapshot.
   */
  checkMs?: number;
  /**
   * What counts as a change worth scheduling a save for. Defaults to the whole snapshot.
   * Fields left out (e.g. a ticking timer) are still written on the next save or flush.
   */
  changeKey?: (value: T) => unknown;
};

/**
 * Debounced saver that skips no-op writes (compares serialized snapshots). Change notifications
 * are coalesced: the snapshot is serialized at most once per `checkMs`, and written once the
 * changes have been quiet for `delayMs` (or `maxWaitMs` has passed).
 * Framework-free so it can be unit tested with fake timers.
 */
export function createAutosaver<T>({
  snapshot,
  save,
  onStatus,
  delayMs = 1000,
  maxWaitMs = 5000,
  checkMs = 250,
  changeKey = (v) => v,
}: Options<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let firstPendingAt: number | null = null;
  let lastSaved = "";
  let lastKey = "";
  /** Key of the change the pending timer is waiting to save. */
  let pendingKey: string | null = null;
  let saving: Promise<void> = Promise.resolve();
  let checkTimer: ReturnType<typeof setTimeout> | undefined;
  /** Oldest and newest change not yet inspected by `check`. */
  let dirtySince: number | null = null;
  let lastChangeAt = 0;

  const serialize = () => {
    const value = snapshot();
    if (value === null) return null;
    return { value, json: JSON.stringify(value), key: JSON.stringify(changeKey(value)) };
  };

  const flush = (): Promise<void> => {
    clearTimeout(checkTimer);
    checkTimer = undefined;
    dirtySince = null;
    clearTimeout(timer);
    timer = undefined;
    firstPendingAt = null;
    pendingKey = null;
    const snap = serialize();
    if (!snap || snap.json === lastSaved) {
      onStatus("saved");
      return saving;
    }
    saving = saving
      .then(() => save(snap.value))
      .then(
        () => {
          lastSaved = snap.json;
          lastKey = snap.key;
          onStatus("saved");
        },
        () => onStatus("error"),
      );
    return saving;
  };

  /** Inspects the changes since the last check; (re)arms the save if they altered the snapshot. */
  const check = () => {
    checkTimer = undefined;
    const since = dirtySince ?? lastChangeAt;
    dirtySince = null;
    const snap = serialize();
    if (!snap || snap.key === lastKey) return;
    // Ignored-field updates (timer ticks) must not keep pushing back an already-pending save.
    if (timer !== undefined && snap.key === pendingKey) return;
    pendingKey = snap.key;
    onStatus("pending");
    firstPendingAt ??= since;
    clearTimeout(timer);
    // Measured from the changes themselves, not from this check, so the check delay doesn't add up.
    const due = Math.min(lastChangeAt + delayMs, firstPendingAt + maxWaitMs);
    const wait = Math.max(0, due - Date.now());
    timer = setTimeout(() => void flush(), wait);
  };

  return {
    /** Treat the current state as already persisted (call right after loading). */
    markSaved() {
      const snap = serialize();
      lastSaved = snap?.json ?? "";
      lastKey = snap?.key ?? "";
    },
    /** Call on every store change. Cheap: the snapshot is inspected later, once per burst. */
    schedule() {
      lastChangeAt = Date.now();
      dirtySince ??= lastChangeAt;
      checkTimer ??= setTimeout(check, checkMs);
    },
    /**
     * True when the current state differs from what was last persisted, including a write
     * that is still in flight or failed. Serializes synchronously; meant for `beforeunload`.
     * Changes outside `changeKey` (timer ticks) don't count.
     */
    hasUnsavedChanges() {
      const snap = serialize();
      return snap !== null && snap.key !== lastKey;
    },
    flush,
    hasPending: () => timer !== undefined || checkTimer !== undefined,
  };
}
