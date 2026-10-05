import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { conceptSummaries } from "@/lib/concepts/load";

export const metadata: Metadata = { title: "Learn · SysDesign Arena" };

export default function LearnPage() {
  const cards = conceptSummaries();
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Learn</h1>
          <p className="text-muted-foreground text-sm">
            {cards.length} short concept cards: what it is, when to use it, trade-offs, and what
            interviewers ask next.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <li key={c.slug}>
              <Link
                href={`/learn/${c.slug}`}
                className="hover:bg-accent/50 flex h-full flex-col gap-2 rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-muted-foreground text-xs tabular-nums">{i + 1}.</span>
                  <span className="font-medium">{c.title}</span>
                </div>
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
      </main>
    </>
  );
}
