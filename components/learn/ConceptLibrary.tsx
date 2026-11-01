"use client";

import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ConceptSummary } from "@/lib/schema";

const normalize = (value: string) => value.toLowerCase().replace(/[\s_-]+/g, "");

export function ConceptLibrary({ cards }: { cards: ConceptSummary[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | ConceptSummary["kind"]>("all");
  const results = cards.filter(
    (c) =>
      (kind === "all" || c.kind === kind) &&
      normalize(`${c.title} ${c.summary} ${c.tags.join(" ")}`).includes(normalize(query)),
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          aria-label="Search concepts"
          placeholder="Search fan-out, outbox, caching…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-md"
        />
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["all", "All concepts"],
              ["pattern", "Interview patterns"],
              ["foundation", "Foundations"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={kind === value ? "secondary" : "ghost"}
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <span className="text-muted-foreground text-xs" aria-live="polite">
          {results.length} concepts
        </span>
      </div>
      {(["pattern", "foundation"] as const).map((group) => {
        const items = results.filter((c) => c.kind === group);
        if (!items.length) return null;
        return (
          <section key={group} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">
                {group === "pattern" ? "Interview patterns" : "Foundations"}
              </h2>
              <p className="text-muted-foreground text-sm">
                {group === "pattern"
                  ? "Practise choosing a method, drawing its data flow, and defending its failure behavior."
                  : "Build the vocabulary and component knowledge behind your design decisions."}
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/learn/${c.slug}`}
                    className="hover:bg-accent/50 flex h-full flex-col gap-2 rounded-xl border p-4 transition-colors"
                  >
                    <span className="font-medium">{c.title}</span>
                    <p className="text-muted-foreground line-clamp-3 text-sm">{c.summary}</p>
                    <div className="mt-auto flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span key={t} className="bg-muted rounded px-1.5 py-0.5 text-[10px]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!results.length && (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-sm">
          No matching concepts. Try another term or switch to All concepts.
        </p>
      )}
    </div>
  );
}
