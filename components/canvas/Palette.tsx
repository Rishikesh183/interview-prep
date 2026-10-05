"use client";

import { BookOpen, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useShortcuts } from "@/components/useShortcuts";
import { Input } from "@/components/ui/input";
import { componentsByCategory, type ComponentDef } from "@/lib/catalog/components";
import { cn } from "@/lib/utils";
import { CATEGORY_STYLES } from "./nodes/categoryStyles";

export const DRAG_MIME = "application/x-sysdesign-node";

type Props = {
  /** Click-to-add fallback (drops near the centre of the viewport). */
  onAdd: (type: string) => void;
};

function matches(def: ComponentDef, q: string): boolean {
  return [def.label, def.type, def.description].some((s) => s.toLowerCase().includes(q));
}

export function Palette({ onAdd }: Props) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  useShortcuts({ search: () => searchRef.current?.focus() });
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return componentsByCategory()
      .map((g) => ({ ...g, items: q ? g.items.filter((d) => matches(d, q)) : g.items }))
      .filter((g) => g.items.length > 0);
  }, [query]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
          <Input
            ref={searchRef}
            aria-label="Search components"
            className="h-8 pl-7 text-xs"
            placeholder="Search components...  /"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-2">
        {groups.map(({ category, items }) => (
          <section key={category.id}>
            <h3 className="text-muted-foreground mb-1 px-1 text-[10px] font-semibold tracking-wider uppercase">
              {category.label}
            </h3>
            <div className="space-y-0.5">
              {items.map((def) => (
                <PaletteItem key={def.type} def={def} onAdd={onAdd} />
              ))}
            </div>
          </section>
        ))}
        {groups.length === 0 && (
          <p className="text-muted-foreground p-2 text-xs">No components match “{query}”.</p>
        )}
      </div>
    </div>
  );
}

function PaletteItem({ def, onAdd }: { def: ComponentDef; onAdd: (type: string) => void }) {
  const Icon = def.icon;
  return (
    <div className="group hover:bg-accent flex items-center rounded-md">
      <button
        type="button"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_MIME, def.type);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={() => onAdd(def.type)}
        title={`${def.description} — drag onto the canvas or click to add`}
        className="flex min-w-0 flex-1 cursor-grab items-center gap-2 px-1.5 py-1 text-left text-xs active:cursor-grabbing"
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded",
            CATEGORY_STYLES[def.category].icon,
          )}
        >
          <Icon className="size-3.5" />
        </span>
        <span className="truncate">{def.label}</span>
      </button>
      {/* New tab, so the design in progress stays open. */}
      <a
        href={`/learn/for/${def.type}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`Learn about ${def.label}`}
        title={`Learn about ${def.label}`}
        className="text-muted-foreground hover:text-foreground px-1.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      >
        <BookOpen className="size-3.5" />
      </a>
    </div>
  );
}
