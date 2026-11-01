import type { Metadata } from "next";
import { ConceptLibrary } from "@/components/learn/ConceptLibrary";
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
            {cards.length} concepts and interview patterns: worked examples, HLD diagrams,
            trade-offs, and follow-up questions to practise.
          </p>
        </div>
        <ConceptLibrary cards={cards} />
      </main>
    </>
  );
}
