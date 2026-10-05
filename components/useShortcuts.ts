"use client";

import { useEffect, useRef } from "react";
import { comboFor, isEditableTarget, matchesCombo } from "@/lib/shortcuts";

/** Binds handlers to shortcut ids from the registry. Ignored while typing in a field. */
export function useShortcuts(handlers: Record<string, () => void>, enabled = true) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isEditableTarget(e.target)) return;
      for (const [id, handler] of Object.entries(ref.current)) {
        if (matchesCombo(e, comboFor(id))) {
          e.preventDefault();
          handler();
          return;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
