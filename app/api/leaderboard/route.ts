import { leaderboardResponse } from "@/lib/leaderboard/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Authenticated, private response. The browser cannot choose the viewer or score limits. */
export function GET() {
  return leaderboardResponse();
}
