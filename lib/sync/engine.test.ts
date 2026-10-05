import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
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
  type AttemptRow,
  type MySolutionRow,
  type ProgressRow,
} from "@/lib/schema";
import { weakUrlShortener } from "@/test/fixtures";
import { SyncEngine, type RemoteAttempts } from "./engine";
import { attemptToRow, rowToAttempt } from "./mapping";

const USER = "11111111-1111-4111-8111-111111111111";

/** In-memory server with the same last-write-wins rule as the Postgres trigger. */
function fakeServer() {
  const rows = new Map<string, AttemptRow>();
  const progress = new Map<string, ProgressRow>();
  const solutions = new Map<string, MySolutionRow>();
  const remote: RemoteAttempts = {
    async listStamps() {
      return [...rows.values()].map((r) => ({ id: r.id, updatedAt: Date.parse(r.updated_at) }));
    },
    async fetch(ids) {
      return ids.flatMap((id) => (rows.has(id) ? [structuredClone(rows.get(id)!)] : []));
    },
    async upsert(batch) {
      for (const row of batch) {
        AttemptRowSchema.parse(row); // what PostgREST would accept
        const existing = rows.get(row.id);
        if (!existing || Date.parse(row.updated_at) >= Date.parse(existing.updated_at)) {
          rows.set(row.id, structuredClone(row));
        }
      }
    },
    async remove(ids) {
      ids.forEach((id) => rows.delete(id));
    },
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
  return { rows, progress, solutions, remote };
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
  it("laptop edit → phone (fresh device) after sign-in sees the same design", async () => {
    const server = fakeServer();
    const laptop = attempt();
    await db().attempts.put(laptop);
    await new SyncEngine(server.remote, USER).syncAll();
    expect(server.rows.size).toBe(1);

    await wipeDevice(); // the phone has nothing locally
    const plan = await new SyncEngine(server.remote, USER).syncAll();
    expect(plan.pull).toEqual([laptop.id]);
    expect(await getAttempt(laptop.id)).toEqual(laptop);
  });

  it("pushes only changed attempts on the fast path", async () => {
    const server = fakeServer();
    const engine = new SyncEngine(server.remote, USER);
    await engine.bindUser();
    const a = attempt();
    await db().attempts.put(a);
    expect(await engine.pushDirty()).toBe(1);
    expect(await engine.pushDirty()).toBe(0);
    await saveAttempt({ ...a, requirements: { ...a.requirements, functional: ["changed"] } });
    expect(await engine.pushDirty()).toBe(1);
    expect(rowToAttempt(server.rows.get(a.id)!).requirements.functional).toEqual(["changed"]);
  });

  it("last write wins in both directions", async () => {
    const server = fakeServer();
    const a = attempt({ updatedAt: 1_000 });
    await server.remote.upsert([
      await attemptToRow({ ...a, updatedAt: 5_000, elapsedMs: 99 }, USER),
    ]);
    await db().attempts.put(a);
    await new SyncEngine(server.remote, USER).syncAll();
    expect((await getAttempt(a.id))!.elapsedMs).toBe(99); // remote was newer

    // A stale push can't overwrite the newer server row.
    await server.remote.upsert([
      await attemptToRow({ ...a, updatedAt: 2_000, elapsedMs: 1 }, USER),
    ]);
    expect(rowToAttempt(server.rows.get(a.id)!).elapsedMs).toBe(99);
  });

  it("propagates deletes both ways", async () => {
    const server = fakeServer();
    const engine = new SyncEngine(server.remote, USER);
    const [a, b] = [attempt(), attempt()];
    await db().attempts.bulkPut([a, b]);
    await engine.syncAll();

    await deleteAttempt(a.id); // deleted here → removed on server
    await engine.pushDirty();
    expect([...server.rows.keys()]).toEqual([b.id]);

    await server.remote.remove([b.id]); // deleted on another device → removed here
    await engine.syncAll();
    expect(await listAttempts()).toEqual([]);
  });

  it("gives legacy (pre-UUID) attempts a UUID before uploading", async () => {
    const server = fakeServer();
    await db().attempts.put(attempt({ id: "abc123" }));
    await new SyncEngine(server.remote, USER).syncAll();
    const [synced] = await listAttempts();
    expect(synced.id).not.toBe("abc123");
    expect(server.rows.has(synced.id)).toBe(true);
  });

  it("treats local attempts as new when a different account signs in", async () => {
    const server = fakeServer();
    await db().attempts.put(attempt());
    const first = new SyncEngine(server.remote, USER);
    await first.bindUser();
    await first.syncAll();

    const other = new SyncEngine(fakeServer().remote, "22222222-2222-4222-8222-222222222222");
    await other.bindUser();
    expect(await db().syncState.count()).toBe(0);
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
