import { solutionContentResponse } from "@/lib/solutions/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return solutionContentResponse((await params).id);
}
