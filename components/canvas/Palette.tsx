"use client";

import { BookOpen, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useShortcuts } from "@/components/useShortcuts";
import { Input } from "@/components/ui/input";
import { componentsByCategory, type ComponentDef } from "@/lib/catalog/components";
import { cn } from "@/lib/utils";
import { CATEGORY_STYLES } from "./nodes/categoryStyles";
import { PRESETS } from "@/lib/graph/presets";
import { useWorkspaceStore } from "@/store/workspace";
import { useReactFlow } from "@xyflow/react";
import { MAX_SERVICE_COUNT } from "@/lib/graph/serviceGroups";

export const DRAG_MIME = "application/x-sysdesign-node";

type Props = {
  /** Click-to-add fallback (drops near the centre of the viewport). */
  onAdd: (type: string) => void;
  track?: import("@/lib/schema").Track;
};

function matches(def: ComponentDef, q: string): boolean {
  return [def.label, def.type, def.description].some((s) => s.toLowerCase().includes(q));
}

export function Palette({ onAdd, track }: Props) {
  const { fitView } = useReactFlow();
  const [query, setQuery] = useState("");
  const [serviceCount, setServiceCount] = useState("3");
  const count = Number(serviceCount);
  const validCount =
    serviceCount.trim() !== "" &&
    Number.isInteger(count) &&
    count >= 1 &&
    count <= MAX_SERVICE_COUNT;
  const searchRef = useRef<HTMLInputElement>(null);
  useShortcuts({ search: () => searchRef.current?.focus() });
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return componentsByCategory()
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (d) =>
            (!track ||
              (track === "backend"
                ? d.category !== "frontend"
                : ["frontend", "annotation", "clients"].includes(d.category) ||
                  d.type === "cdn")) &&
            (!q || matches(d, q)),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [query, track]);

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
        {track !== "frontend" && (
          <div className="space-y-1">
            <label htmlFor="starter-service-count" className="text-xs font-medium">
              Microservices in starter
            </label>
            <Input
              id="starter-service-count"
              type="number"
              min={1}
              max={MAX_SERVICE_COUNT}
              step={1}
              className="h-8 text-xs"
              value={serviceCount}
              aria-invalid={!validCount}
              onChange={(e) => setServiceCount(e.target.value)}
            />
            <p className="text-muted-foreground text-[10px]">
              Choose 1–{MAX_SERVICE_COUNT}; change it later in the upstream component’s Config.
            </p>
          </div>
        )}
        {track !== "frontend" &&
          PRESETS.filter(
            (p) =>
              !query || `${p.label} ${p.description}`.toLowerCase().includes(query.toLowerCase()),
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={!validCount}
              title={p.description}
              className="hover:bg-accent w-full rounded-md border px-2 py-2 text-left text-xs disabled:opacity-50"
              onClick={() => {
                const ids = useWorkspaceStore.getState().addPreset(p.id, count);
                const upstream = useWorkspaceStore
                  .getState()
                  .nodes.find(
                    (n) =>
                      ids.includes(n.id) &&
                      n.type === (p.id === "distributed-limiter" ? "rate_limiter" : "edge_gateway"),
                  );
                if (upstream) useWorkspaceStore.getState().selectNodes([upstream.id]);
                requestAnimationFrame(
                  () =>
                    void fitView({ nodes: ids.map((id) => ({ id })), padding: 0.2, maxZoom: 1 }),
                );
              }}
            >
              {p.label}
              <span className="text-muted-foreground mt-1 block text-[10px]">{p.description}</span>
            </button>
          ))}
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
