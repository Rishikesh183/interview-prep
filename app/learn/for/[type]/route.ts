import { NextResponse } from "next/server";
import { loadConcepts } from "@/lib/concepts/load";
import { conceptForComponent } from "@/lib/content/conceptCards";

/** The palette's "Learn" link: /learn/for/<catalog type> → the card that explains it. */
export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const card = conceptForComponent(loadConcepts(), (await params).type);
  return NextResponse.redirect(new URL(card ? `/learn/${card.slug}` : "/learn", req.url));
}
