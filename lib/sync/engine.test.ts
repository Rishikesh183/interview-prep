import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAttempt, listAttempts, deleteAttempt, saveAttempt } from "@/lib/db/attempts";
import { getProgress, recordResult } from "@/lib/db/progress";
import { db } from "@/lib/db/dexie";
import {
  deleteMySolution,
  listMySolutions,
  renameMySolution,
  saveMySolution,
} from "@/lib/db/mySolutions";
import {
  AttemptRowSchema,
  MySolutionRowSchema,
  type Attempt,
  type MySolutionRow,
  type ProgressRow,
} from "@/lib/schema";
import { weakUrlShortener } from "@/test/fixtures";
import { SyncEngine, type RemoteProfile } from "./engine";
import { attemptToRow, rowToAttempt } from "./mapping";

const USER = "11111111-1111-4111-8111-111111111111";

/** In-memory server with the same last-write-wins rule as the Postgres trigger. */
function fakeServer() {
  const progress = new Map<string, ProgressRow>();
  const solutions = new Map<string, MySolutionRow>();
  const attemptTransport = {
    listStamps: vi.fn(async () => {
      throw new Error("History must never be listed remotely");
    }),
    fetch: vi.fn(async () => {
      throw new Error("History must never be downloaded");
    }),
    upsert: vi.fn(async () => {
      throw new Error("History must never be uploaded");
    }),
    remove: vi.fn(async () => {
      throw new Error("History must never be deleted remotely");
    }),
  };
  const remote: RemoteProfile & typeof attemptTransport = {
    ...attemptTransport,
    async listProgress() {
      return [...progress.values()].map((r) => structuredClone(r));
    },
    async upsertProgress(batch) {
      // Same rule as the keep-best trigger.
      for (const row of batch) {
        const old = progress.get(row.problem_id);
        const solved = [old?.solved_at, row.solved_at]
          .filter((x): x is string => Boolean(x))
          .sort();
        progress.set(row.problem_id, {
          ...row,
          best_points: Math.max(old?.best_points ?? 0, row.best_points ?? 0),
          best_ratio: Math.max(old?.best_ratio ?? 0, row.best_ratio ?? 0),
          solved_at: solved[0] ?? null,
        });
      }
    },
    async listMySolutions() {
      return [...solutions.values()].map((r) => structuredClone(r));
    },
    async upsertMySolutions(batch) {
      for (const row of batch)
        solutions.set(row.id, MySolutionRowSchema.parse(structuredClone(row)));
    },
    async removeMySolutions(ids) {
      ids.forEach((id) => solutions.delete(id));
    },
  };
  return { progress, solutions, remote, attemptTransport };
}

async function wipeDevice() {
  const d = db();
  await Promise.all([
    d.attempts.clear(),
    d.syncState.clear(),
    d.tombstones.clear(),
    d.meta.clear(),
    d.progress.clear(),
    d.mySolutions.clear(),
  ]);
}

const attempt = (over: Partial<Attempt> = {}): Attempt => ({
  ...weakUrlShortener(),
  id: crypto.randomUUID(),
  updatedAt: 1_000,
  ...over,
});

beforeEach(wipeDevice);

describe("mapping", () => {
  it("round-trips an attempt through a Supabase row", async () => {
    const a = attempt({ status: "reviewed", stage: "design", elapsedMs: 4200, timerPaused: true });
    const row = await attemptToRow(a, USER);
    expect(AttemptRowSchema.parse(row).status).toBe("submitted");
    expect(row.graph?.v).toBe(1);
    expect(row.graph_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rowToAttempt(row)).toEqual(a);
  });
});

describe("SyncEngine", () => {
  it("does not lose a result recorded while the progress pull is in flight", async () => {
    const server = fakeServer();
    vi.spyOn(server.remote, "listProgress").mockImplementation(async () => {
      await recordResult({
        problemId: "url-shortener",
        points: 10,
        ratio: 1,
        solved: true,
        at: 2000,
      });
      return [
        {
          user_id: USER,
          problem_id: "url-shortener",
          best_points: 5,
          best_ratio: 0.5,
          solved_at: null,
        },
      ];
    });
    await new SyncEngine(server.remote, USER).syncAll();
    expect(await getProgress("url-shortener")).toMatchObject({ bestPoints: 10, bestRatio: 1 });
  });

  it("marks only the uploaded progress version as pushed without overwriting a newer submit", async () => {
    const server = fakeServer();
    await recordResult({
      problemId: "url-shortener",
      points: 5,
      ratio: 0.5,
      solved: false,
      at: 1000,
    });
    vi.spyOn(server.remote, "upsertProgress").mockImplementation(async () => {
      await recordResult({
        problemId: "url-shortener",
        points: 10,
        ratio: 1,
        solved: true,
        at: 2000,
      });
    });
    await new SyncEngine(server.remote, USER).pushDirty();
    expect(await getProgress("url-shortener")).toMatchObject({
      bestPoints: 10,
      updatedAt: 2000,
      pushedAt: 1000,
    });
  });

  it("does not overwrite a solution renamed during its upload", async () => {
    const server = fakeServer();
    const saved = await saveMySolution(attempt({ status: "submitted" }), "Original");
    vi.spyOn(server.remote, "upsertMySolutions").mockImplementation(async () => {
      await renameMySolution(saved.id, "Renamed during upload");
    });
    await new SyncEngine(server.remote, USER).pushDirty();
    expect((await listMySolutions("url-shortener"))[0].title).toBe("Renamed during upload");
  });
  it("never uploads, downloads, rekeys or deletes local attempt history", async () => {
    const server = fakeServer();
    const entries = [
      attempt(),
      attempt({ id: "legacy-id", status: "submitted" }),
      attempt({ status: "reviewed" }),
    ];
    await db().attempts.bulkPut(entries);
    await db().syncState.put({ id: entries[0].id, syncedUpdatedAt: 0 });
    await db().tombstones.put({ id: "old-cloud-attempt", deletedAt: 1 });
    const engine = new SyncEngine(server.remote, USER);
    await engine.bindUser();
    await engine.syncAll();
    expect(await engine.pushDirty()).toBe(0);
    for (const entry of entries) expect(await getAttempt(entry.id)).toEqual(entry);
    for (const call of Object.values(server.attemptTransport)) expect(call).not.toHaveBeenCalled();
  });

  it("local edits and deletions do not schedule cloud history writes", async () => {
    const server = fakeServer();
    const engine = new SyncEngine(server.remote, USER);
    const local = attempt();
    await saveAttempt(local);
    expect(await engine.pushDirty()).toBe(0);
    await deleteAttempt(local.id);
    expect(await engine.pushDirty()).toBe(0);
    expect(await db().tombstones.count()).toBe(0);
    expect(await listAttempts()).toEqual([]);
    for (const call of Object.values(server.attemptTransport)) expect(call).not.toHaveBeenCalled();
  });

  it("binding another account leaves device history and its IDs intact", async () => {
    const local = attempt({ id: "local-history" });
    await db().attempts.put(local);
    await new SyncEngine(fakeServer().remote, USER).bindUser();
    await new SyncEngine(fakeServer().remote, "22222222-2222-4222-8222-222222222222").bindUser();
    expect(await getAttempt(local.id)).toEqual(local);
  });

  it("syncs progress across devices and never lowers it", async () => {
    const server = fakeServer();
    await recordResult({
      problemId: "url-shortener",
      points: 18,
      ratio: 0.9,
      solved: true,
      at: 1_000,
    });
    await new SyncEngine(server.remote, USER).syncAll();
    expect(server.progress.get("url-shortener")).toMatchObject({ best_points: 18 });

    // Phone: worse local result for the same problem, then sync.
    await wipeDevice();
    await recordResult({
      problemId: "url-shortener",
      points: 5,
      ratio: 0.4,
      solved: false,
      at: 2_000,
    });
    await new SyncEngine(server.remote, USER).syncAll();
    expect(await getProgress("url-shortener")).toMatchObject({
      bestPoints: 18,
      bestRatio: 0.9,
      solvedAt: 1_000,
    });
    expect(server.progress.get("url-shortener")).toMatchObject({
      best_points: 18,
      best_ratio: 0.9,
    });
  });

  it("syncs saved solutions, including renames and deletes", async () => {
    const server = fakeServer();
    const laptop = new SyncEngine(server.remote, USER);
    const saved = await saveMySolution(attempt({ status: "submitted" }), "Cache-aside v1");
    await laptop.syncAll();
    expect(server.solutions.get(saved.id)).toMatchObject({ title: "Cache-aside v1" });

    // Phone pulls it, with the graph intact.
    await wipeDevice();
    await new SyncEngine(server.remote, USER).syncAll();
    const [pulled] = await listMySolutions("url-shortener");
    expect(pulled).toMatchObject({ id: saved.id, title: "Cache-aside v1" });
    expect(pulled.graph.nodes.length).toBe(saved.graph.nodes.length);

    await renameMySolution(saved.id, "Final");
    expect(await laptop.pushDirty()).toBe(1);
    expect(server.solutions.get(saved.id)?.title).toBe("Final");

    await deleteMySolution(saved.id);
    expect(await listMySolutions("url-shortener")).toEqual([]);
    await laptop.pushDirty();
    expect(server.solutions.size).toBe(0);
  });
});
