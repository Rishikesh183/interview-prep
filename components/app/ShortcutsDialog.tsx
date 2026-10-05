"use client";

import { Keyboard } from "lucide-react";
import { create } from "zustand";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SHORTCUTS, type ShortcutScope } from "@/lib/shortcuts";

export const useShortcutsDialog = create<{ open: boolean; setOpen: (open: boolean) => void }>()(
  (set) => ({ open: false, setOpen: (open) => set({ open }) }),
);

const SCOPES: ShortcutScope[] = ["Anywhere", "Problem workspace", "Canvas"];

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {keys.map((k) => (
        <kbd key={k} className="bg-muted rounded border px-1.5 py-0.5 font-mono text-[11px]">
          {k}
        </kbd>
      ))}
    </span>
  );
}

export function ShortcutsDialog() {
  const { open, setOpen } = useShortcutsDialog();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Shortcuts are ignored while you type in a field.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {SCOPES.map((scope) => (
            <section key={scope} className="space-y-1.5">
              <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {scope}
              </h3>
              <ul className="space-y-1">
                {SHORTCUTS.filter((s) => s.scope === scope && !s.hidden).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-4 text-sm">
                    {s.description}
                    <Keys keys={s.keys} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ShortcutsButton() {
  const setOpen = useShortcutsDialog((s) => s.setOpen);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setOpen(true)}
      aria-label="Keyboard shortcuts (?)"
      title="Keyboard shortcuts (?)"
    >
      <Keyboard />
    </Button>
  );
}
