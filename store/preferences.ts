import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

/** Per-browser conveniences. Storage can be unavailable (private mode), so failures are ignored. */
const safeLocalStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

type Preferences = {
  /** Lint rule 14: show "likely missing components". Off = no-hints practice. */
  keyComponentHints: boolean;
  lintDrawerOpen: boolean;
  set: (patch: Partial<Omit<Preferences, "set">>) => void;
};

export const usePreferences = create<Preferences>()(
  persist(
    (set) => ({
      keyComponentHints: true,
      lintDrawerOpen: true,
      set: (patch) => set(patch),
    }),
    {
      name: "sysdesign-arena:prefs",
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: ({ keyComponentHints, lintDrawerOpen }) => ({
        keyComponentHints,
        lintDrawerOpen,
      }),
    },
  ),
);
