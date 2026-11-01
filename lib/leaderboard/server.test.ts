import { beforeEach, describe, expect, it, vi } from "vitest";
import { leaderboardResponse } from "./server";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), admin: vi.fn() }));
vi.mock("@/lib/supabase/config", () => ({ isSupabaseConfigured: true }));
vi.mock("@/lib/supabase/server", () => ({
  supabaseServer: async () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("@/lib/supabase/admin", () => ({ supabaseAdmin: mocks.admin }));

const viewer = "00000000-0000-4000-8000-000000000001";
const entry = {
  user_id: viewer,
  display_name: "Ada",
  total_points: 50,
  solved_count: 2,
  attempted_count: 3,
  rank: 1,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: viewer } }, error: null });
  mocks.admin.mockReturnValue({ rpc: mocks.rpc });
  mocks.rpc.mockResolvedValue({
    data: { entries: [entry], current_user: entry, total_participants: 1 },
    error: null,
  });
});

describe("authenticated all-time leaderboard", () => {
  it("does not query cross-user data for a signed-out or rejected session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await leaderboardResponse()).status).toBe(401);
    expect(mocks.admin).not.toHaveBeenCalled();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: viewer } },
      error: { message: "Invalid session" },
    });
    expect((await leaderboardResponse()).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("supplies the verified viewer and repository point caps, returning only aggregate data", async () => {
    const response = await leaderboardResponse();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const body = await response.json();
    expect(body).toMatchObject({
      viewer_id: viewer,
      current_user: entry,
      maximum_points: 1130,
      problem_count: 45,
    });
    const [name, args] = mocks.rpc.mock.calls[0];
    expect(name).toBe("all_time_leaderboard");
    expect(args.p_viewer).toBe(viewer);
    expect(args.p_catalog).toHaveLength(45);
    expect(
      args.p_catalog.find((p: { problem_id: string }) => p.problem_id === "frontend-autocomplete"),
    ).toEqual({ problem_id: "frontend-autocomplete", max_points: 20 });
  });

  it("handles an empty board and unranked current user", async () => {
    mocks.rpc.mockResolvedValue({
      data: { entries: [], current_user: null, total_participants: 0 },
      error: null,
    });
    expect(await (await leaderboardResponse()).json()).toMatchObject({
      entries: [],
      current_user: null,
      total_participants: 0,
    });
  });

  it("does not leak backend details when the RPC fails or isn't installed", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "Sensitive backend detail" },
    });
    const response = await leaderboardResponse();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("Sensitive backend detail");
    log.mockRestore();
  });

  it("rejects malformed aggregate output and handles a missing server key", async () => {
    mocks.rpc.mockResolvedValue({
      data: { entries: [{ email: "private@example.test" }] },
      error: null,
    });
    expect((await leaderboardResponse()).status).toBe(503);
    mocks.admin.mockReturnValue(null);
    expect((await leaderboardResponse()).status).toBe(503);
  });
});
