/**
 * Keyboard shortcuts. One registry drives both the handlers and the "?" help dialog.
 * Alt combos match on `event.code` so they work on macOS too (Option+1 types "¡").
 */

export type ShortcutScope = "Anywhere" | "Problem workspace" | "Canvas";

export type Shortcut = {
  id: string;
  /** e.g. "alt+Digit1", "mod+z", "shift+mod+z", "?" or "/" (`mod` = Ctrl, or Cmd on macOS). */
  combo: string;
  /** How it's shown in the help dialog. */
  keys: string[];
  description: string;
  scope: ShortcutScope;
  /** Alias that works but isn't listed separately in the help dialog. */
  hidden?: boolean;
};

const STAGE_KEYS = ["Requirements", "Estimation", "Data model", "APIs", "Design", "Review"].map(
  (label, i): Shortcut => ({
    id: `stage-${i + 1}`,
    combo: `alt+Digit${i + 1}`,
    keys: ["Alt", String(i + 1)],
    description: `Go to ${label}`,
    scope: "Problem workspace",
  }),
);

export const SHORTCUTS: Shortcut[] = [
  { id: "help", combo: "?", keys: ["?"], description: "Show keyboard shortcuts", scope: "Anywhere" },
  { id: "theme", combo: "alt+KeyD", keys: ["Alt", "D"], description: "Toggle dark mode", scope: "Anywhere" },
  ...STAGE_KEYS,
  { id: "panel", combo: "alt+KeyP", keys: ["Alt", "P"], description: "Show / hide the problem panel", scope: "Problem workspace" },
  { id: "timer", combo: "alt+KeyT", keys: ["Alt", "T"], description: "Pause / resume the timer", scope: "Problem workspace" },
  { id: "tests", combo: "alt+KeyR", keys: ["Alt", "R"], description: "Run tests", scope: "Problem workspace" },
  { id: "lint", combo: "alt+KeyL", keys: ["Alt", "L"], description: "Open / close the lint drawer", scope: "Canvas" },
  { id: "search", combo: "/", keys: ["/"], description: "Search components", scope: "Canvas" },
  { id: "undo", combo: "mod+z", keys: ["Ctrl", "Z"], description: "Undo", scope: "Canvas" },
  { id: "redo", combo: "shift+mod+z", keys: ["Ctrl", "Shift", "Z"], description: "Redo (also Ctrl+Y)", scope: "Canvas" },
  { id: "redo-y", combo: "mod+y", keys: ["Ctrl", "Y"], description: "Redo", scope: "Canvas", hidden: true },
  { id: "duplicate", combo: "mod+d", keys: ["Ctrl", "D"], description: "Duplicate selection", scope: "Canvas" },
  { id: "delete", combo: "Delete", keys: ["Del"], description: "Delete selection (also Backspace)", scope: "Canvas" },
  { id: "multi", combo: "", keys: ["Shift", "drag"], description: "Box-select several nodes", scope: "Canvas" },
]; // prettier-ignore

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.closest("[role='dialog'], [role='listbox'], [role='menu']") !== null
  );
}

type KeyEventLike = Pick<
  KeyboardEvent,
  "key" | "code" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey"
>;

/** True when the event matches a combo string from the registry. */
export function matchesCombo(e: KeyEventLike, combo: string): boolean {
  if (!combo) return false;
  const parts = combo.split("+");
  const key = parts.pop()!;
  const want = new Set(parts);
  const mod = e.ctrlKey || e.metaKey;
  if (want.has("alt") !== e.altKey || want.has("mod") !== mod) return false;
  // "?" and "/" are typed characters: the shift state is implied by the key itself.
  if (key === "?" || key === "/") return e.key === key;
  if (want.has("shift") !== e.shiftKey) return false;
  return key.length > 1 && /^(Key|Digit)/.test(key)
    ? e.code === key
    : e.key.toLowerCase() === key.toLowerCase();
}

export function comboFor(id: string): string {
  return SHORTCUTS.find((s) => s.id === id)?.combo ?? "";
}
