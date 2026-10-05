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
   * What counts as a change worth scheduling a save for. Defaults to the whole snapshot.
   * Fields left out (e.g. a ticking timer) are still written on the next save or flush.
   */
  changeKey?: (value: T) => unknown;
};

/**
 * Debounced saver that skips no-op writes (compares serialized snapshots).
 * Framework-free so it can be unit tested with fake timers.
 */
export function createAutosaver<T>({
  snapshot,
  save,
  onStatus,
  delayMs = 1000,
  maxWaitMs = 5000,
  changeKey = (v) => v,
}: Options<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let firstPendingAt: number | null = null;
  let lastSaved = "";
  let lastKey = "";
  /** Key of the change the pending timer is waiting to save. */
  let pendingKey: string | null = null;
  let saving: Promise<void> = Promise.resolve();

  const serialize = () => {
    const value = snapshot();
    if (value === null) return null;
    return { value, json: JSON.stringify(value), key: JSON.stringify(changeKey(value)) };
  };

  const flush = (): Promise<void> => {
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

  return {
    /** Treat the current state as already persisted (call right after loading). */
    markSaved() {
      const snap = serialize();
      lastSaved = snap?.json ?? "";
      lastKey = snap?.key ?? "";
    },
    /** Call on every store change; ignores changes that don't alter the snapshot. */
    schedule() {
      const snap = serialize();
      if (!snap || snap.key === lastKey) return;
      // Ignored-field updates (timer ticks) must not keep pushing back an already-pending save.
      if (timer !== undefined && snap.key === pendingKey) return;
      pendingKey = snap.key;
      onStatus("pending");
      const now = Date.now();
      firstPendingAt ??= now;
      clearTimeout(timer);
      const wait = Math.min(delayMs, Math.max(0, firstPendingAt + maxWaitMs - now));
      timer = setTimeout(() => void flush(), wait);
    },
    flush,
    hasPending: () => timer !== undefined,
  };
}
