import { usageSummary } from "@/lib/ai/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → AiUsage: configured models and today's AI budget for the signed-in user. */
export async function GET() {
  return Response.json(await usageSummary());
}
