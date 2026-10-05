import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { GraphViewer } from "@/components/canvas/GraphViewer";
import { Markdown } from "@/components/content/Markdown";
import { CATALOG } from "@/lib/catalog/components";
import { getConcept, loadConcepts } from "@/lib/concepts/load";
import { loadProblems } from "@/lib/problems/load";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return loadConcepts().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const card = getConcept((await params).slug);
  return { title: card ? `${card.title} · Learn` : "Not found" };
}

export default async function ConceptPage({ params }: Params) {
  const card = getConcept((await params).slug);
  if (!card) notFound();
  const related = card.related.map(getConcept).filter((c) => c !== undefined);
  const usedBy = loadProblems().filter((p) => p.prerequisites.includes(card.slug));

  return (
    <>
      <AppHeader />
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_260px]">
        <article className="min-w-0 space-y-6">
          <div className="space-y-2">
            <Link
              href="/learn"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
            >
              <ArrowLeft className="size-3" /> All concepts
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">{card.title}</h1>
            <div className="flex flex-wrap gap-1">
              {card.tags.map((t) => (
                <span key={t} className="bg-muted rounded px-1.5 py-0.5 text-xs">
                  {t}
                </span>
              ))}
            </div>
          </div>
          {card.graph && (
            <div className="h-[300px] overflow-hidden rounded-lg border">
              <GraphViewer graph={card.graph} />
            </div>
          )}
          <Markdown>{card.body}</Markdown>
        </article>

        <aside className="space-y-6 text-sm">
          {card.components.length > 0 && (
            <Section title="Components">
              {card.components.map((t) => (
                <li key={t}>{CATALOG[t]?.label ?? t}</li>
              ))}
            </Section>
          )}
          {related.length > 0 && (
            <Section title="Related">
              {related.map((c) => (
                <li key={c.slug}>
                  <Link href={`/learn/${c.slug}`} className="text-primary hover:underline">
                    {c.title}
                  </Link>
                </li>
              ))}
            </Section>
          )}
          {usedBy.length > 0 && (
            <Section title="Practise it">
              {usedBy.map((p) => (
                <li key={p.id}>
                  <Link href={`/problems/${p.id}`} className="text-primary hover:underline">
                    {p.number}. {p.title}
                  </Link>
                </li>
              ))}
            </Section>
          )}
        </aside>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
        {title}
      </h2>
      <ul className="space-y-1">{children}</ul>
    </section>
  );
}
