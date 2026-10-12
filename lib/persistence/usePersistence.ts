"use client";

import { useEffect, useState } from "react";
import { createAutosaver, type SaveStatus } from "./autosaver";

type Subscribe = (listener: () => void) => () => void;

type Options<T> = {
  /** Loads and applies state to the stores. Re-runs when `key` changes. */
  load: () => Promise<void>;
  snapshot: () => T | null;
  save: (value: T) => Promise<void>;
  /** Store subscriptions that should trigger an autosave. */
  subscribe: Subscribe[];
  key: string;
  changeKey?: (value: T) => unknown;
};

/**
 * Load once, then autosave on store changes; flushes when the tab hides or the view unmounts.
 * Closing or reloading the tab with changes not yet written asks the browser to confirm.
 */
export function usePersistence<T>({
  load,
  snapshot,
  save,
  subscribe,
  key,
  changeKey,
}: Options<T>): SaveStatus {
  const [status, setStatus] = useState<SaveStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    let loaded = false;
    let unsubs: (() => void)[] = [];
    const saver = createAutosaver({
      snapshot,
      save,
      changeKey,
      onStatus: (s) => {
        if (!cancelled) setStatus(s);
      },
    });
    const onHide = () => {
      if (document.visibilityState === "hidden") void saver.flush();
    };
    const onPageHide = () => void saver.flush();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!saver.hasUnsavedChanges()) return;
      // Start writing now: if the user stays (or the page lingers), the save still lands.
      void saver.flush();
      e.preventDefault();
      // Older browsers only show the prompt when returnValue is set.
      e.returnValue = "";
    };

    setStatus("loading");
    void load().then(() => {
      if (cancelled) return;
      loaded = true;
      saver.markSaved();
      setStatus("saved");
      unsubs = subscribe.map((sub) => sub(() => saver.schedule()));
      document.addEventListener("visibilitychange", onHide);
      window.addEventListener("pagehide", onPageHide);
      window.addEventListener("beforeunload", onBeforeUnload);
    });

    return () => {
      // Never flush before loading: the stores may still hold a previous page's state.
      if (loaded) void saver.flush();
      cancelled = true;
      unsubs.forEach((u) => u());
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
    // `key` identifies what is loaded; the callbacks are expected to be stable per key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return status;
}
