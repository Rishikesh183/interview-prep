import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/dexie";
import { newAttempt, saveAttempt, deleteAttempt } from "@/lib/db/attempts";
import {
  draftKey,
  designOf,
  attemptFromDraft,
  acceptCloudDraft,
  keepDeviceDraft,
  receiveDraft,
} from "@/lib/db/drafts";
import { SyncEngine, type RemoteProfile } from "./engine";
import { DraftWriteResultSchema, type DraftRow } from "@/lib/schema";
import { node } from "@/test/fixtures";

const USER = "11111111-1111-4111-8111-111111111111",
  OTHER = "22222222-2222-4222-8222-222222222222";
const draft = (label = "First design", userId = USER) => ({
  ...newAttempt("rate-limiter"),
  ownerUserId: userId,
  graph: { nodes: [node("n1", "service", label)], edges: [] },
});
const local = () => db().drafts.get(draftKey(USER, "rate-limiter"));
async function wipe() {
  await Promise.all([
    db().drafts.clear(),
    db().attempts.clear(),
    db().meta.clear(),
    db().progress.clear(),
    db().mySolutions.clear(),
  ]);
}
beforeEach(wipe);

function server() {
  const rows = new Map<string, DraftRow>();
  const remote: RemoteProfile = {
    listProgress: async () => [],
    upsertProgress: async () => {},
    listMySolutions: async () => [],
    upsertMySolutions: async () => {},
    removeMySolutions: async () => {},
    listDrafts: async () => structuredClone([...rows.values()]),
    saveDraft: async (problem, content, revision, userId) => {
      const id = draftKey(userId, problem),
        old = rows.get(id);
      if (old && old.revision !== revision)
        return DraftWriteResultSchema.parse({ outcome: "conflict", row: old });
      const row: DraftRow = {
        user_id: userId,
        problem_id: problem,
        revision: (old?.revision ?? 0) + 1,
        content: structuredClone(content),
        updated_at: new Date().toISOString(),
      };
      rows.set(id, row);
      return { outcome: "saved", row };
    },
  };
  return { rows, remote, engine: new SyncEngine(remote, USER) };
}

describe("one current cloud design per user/question", () => {
  it("upgrades latest legacy local work for the same account, not submitted history or another account", async () => {
    const s = server();
    await db().meta.put({ key: "syncUserId", value: USER });
    const older = { ...draft("Older"), ownerUserId: undefined, updatedAt: 1 };
    const latest = { ...draft("Yesterday's HLD"), ownerUserId: undefined, updatedAt: 2 };
    await db().attempts.bulkPut([
      older,
      latest,
      { ...draft("Submitted"), problemId: "chat-app", status: "submitted" },
      { ...draft("Other account", OTHER), problemId: "video-streaming" },
    ]);
    await s.engine.bindUser();
    await s.engine.syncAll();
    expect(s.rows.size).toBe(1);
    expect(s.rows.values().next().value!.content.graph.n[0].l).toBe("Yesterday's HLD");
    expect(await db().attempts.count()).toBe(4);
  });
  it("resumes graph, APIs, entities and requirements on a second device without uploading history", async () => {
    const s = server(),
      a = draft();
    a.graph.nodes.push(node("n2", "cache", "Counters"));
    a.apis = [{ id: "a1", ownerNodeId: "n1", method: "POST", path: "/check", auth: true }];
    a.entities = [{ name: "Bucket", fields: "tokens, lastRefill", storeNodeId: "n2" }];
    a.requirements.functional = ["Check global bucket atomically"];
    await saveAttempt(a, USER);
    await s.engine.syncAll();
    const original = (await local())!;
    expect(s.rows.size).toBe(1);
    expect(original.dirty).toBe(false);
    const content = s.rows.values().next().value!.content;
    expect(Object.keys(content)).not.toContain("review");
    expect(Object.keys(content)).not.toContain("submittedAt");
    expect(Object.keys(content)).not.toContain("elapsedMs");
    await wipe();
    await new SyncEngine(s.remote, USER).syncAll();
    expect(await db().attempts.count()).toBe(0);
    const resumed = attemptFromDraft((await local())!);
    expect(resumed.id).not.toBe(a.id);
    expect(resumed.graph.nodes.map((n) => n.data.label)).toEqual(
      a.graph.nodes.map((n) => n.data.label),
    );
    expect(resumed.apis).toEqual(a.apis);
    expect(resumed.entities).toEqual(a.entities);
    expect(resumed.requirements).toEqual(a.requirements);
    expect(resumed.status).toBe("in_progress");
    expect(resumed.ownerUserId).toBe(USER);
  });
  it("updates one row and doesn't erase local history when submitted", async () => {
    const s = server(),
      a = draft();
    await saveAttempt(a, USER);
    await s.engine.pushDirty();
    a.graph.nodes[0].data.label = "Improved design";
    await saveAttempt(a, USER);
    await s.engine.pushDirty();
    expect(s.rows.size).toBe(1);
    expect((await local())!.revision).toBe(2);
    expect(await db().attempts.count()).toBe(1);
    await deleteAttempt(a.id);
    expect(await db().attempts.count()).toBe(0);
    expect(s.rows.size).toBe(1);
    const readOnly = { ...a, status: "submitted" as const, points: 10 };
    await saveAttempt(readOnly, USER);
    await s.engine.pushDirty();
    expect((await db().attempts.get(a.id))!.status).toBe("submitted");
    expect(s.rows.size).toBe(1);
  });
  it("stages simultaneous edits instead of silently overwriting another laptop", async () => {
    const s = server(),
      a = draft();
    await saveAttempt(a, USER);
    await s.engine.syncAll();
    const deviceA = structuredClone((await local())!);
    await wipe();
    await s.engine.syncDrafts();
    const b = attemptFromDraft((await local())!);
    await db().drafts.update(draftKey(USER, a.problemId), { linkedAttemptId: b.id });
    b.graph.nodes[0].data.label = "Laptop B";
    await saveAttempt(b, USER);
    await s.engine.syncDrafts();
    expect(s.rows.values().next().value!.revision).toBe(2);
    await wipe();
    await db().drafts.put(deviceA);
    a.graph.nodes[0].data.label = "Laptop A offline edit";
    await saveAttempt(a, USER);
    await s.engine.syncDrafts();
    expect((await local())!.remote!.revision).toBe(2);
    expect((await local())!.content.graph.n[0].l).toBe("Laptop A offline edit");
    expect(s.rows.values().next().value!.content.graph.n[0].l).toBe("Laptop B");
    await keepDeviceDraft(USER, a.problemId);
    await s.engine.pushDirty();
    expect(s.rows.values().next().value!.content.graph.n[0].l).toBe("Laptop A offline edit");
    expect((await local())!.revision).toBe(3);
  });
  it("can choose the cloud version without losing another problem's local work", async () => {
    const s = server(),
      a = draft();
    await saveAttempt(a, USER);
    await s.engine.pushDirty();
    const row = s.rows.values().next().value!;
    const remote = structuredClone(row);
    remote.revision++;
    remote.content.graph.n[0].l = "Remote";
    await receiveDraft(remote, USER);
    const copy = await acceptCloudDraft(USER, a.problemId);
    expect(copy!.content.graph.n[0].l).toBe("Remote");
    expect(copy!.dirty).toBe(false);
    expect(copy!.linkedAttemptId).toBeUndefined();
    expect((await db().attempts.get(a.id))!.graph.nodes[0].data.label).toBe("First design");
  });
  it("does not mark a newer local edit as uploaded when an old request finishes", async () => {
    const s = server(),
      a = draft();
    await saveAttempt(a, USER);
    const save = s.remote.saveDraft!;
    s.remote.saveDraft = async (...args) => {
      const result = await save(...args);
      a.graph.nodes[0].data.label = "Changed during network request";
      await saveAttempt(a, USER);
      return result;
    };
    await s.engine.pushDirty();
    expect((await local())!.dirty).toBe(true);
    expect((await local())!.revision).toBe(1);
    s.remote.saveDraft = save;
    await s.engine.pushDirty();
    expect((await local())!.dirty).toBe(false);
    expect(s.rows.values().next().value!.content.graph.n[0].l).toBe(
      "Changed during network request",
    );
  });
  it("doesn't silently publish local work over a cloud draft that arrived after initial loading", async () => {
    const a = draft(),
      cloud: DraftRow = {
        user_id: USER,
        problem_id: a.problemId,
        revision: 3,
        content: designOf(a),
        updated_at: new Date().toISOString(),
      };
    await receiveDraft(cloud, USER);
    a.graph.nodes[0].data.label = "Local edit started before cloud arrived";
    await saveAttempt(a, USER);
    expect((await local())!.remote!.revision).toBe(3);
    expect((await local())!.dirty).toBe(true);
  });
  it("keeps queues account-scoped and ignores cancelled-account responses", async () => {
    const a = draft();
    await saveAttempt(a, OTHER);
    expect(await db().drafts.count()).toBe(0);
    await saveAttempt(a, USER);
    const s = server();
    s.remote.listDrafts = async () => {
      s.engine.cancel();
      return [
        {
          user_id: USER,
          problem_id: "other-question",
          revision: 1,
          content: designOf(a),
          updated_at: new Date().toISOString(),
        },
      ];
    };
    await s.engine.syncDrafts();
    expect(await db().drafts.count()).toBe(1);
    expect(s.rows.size).toBe(0);
    await expect(
      receiveDraft(
        {
          user_id: OTHER,
          problem_id: a.problemId,
          revision: 1,
          content: designOf(a),
          updated_at: new Date().toISOString(),
        },
        USER,
      ),
    ).rejects.toThrow(/account mismatch/);
  });
  it("retains dirty work after offline/upload failure and ignores obsolete autosaver writes", async () => {
    const s = server(),
      a = draft();
    await saveAttempt(a, USER);
    s.remote.saveDraft = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(s.engine.pushDirty()).rejects.toThrow("offline");
    expect((await local())!.dirty).toBe(true);
    a.graph.nodes[0].data.label = "Obsolete autosave";
    await saveAttempt(a, USER, () => false);
    expect((await local())!.content.graph.n[0].l).toBe("First design");
  });
  it("retains per-account progress and saved-solution caches while switching accounts", async () => {
    const s = server();
    await s.engine.bindUser();
    await db().progress.put({ problemId: "p", bestPoints: 10, bestRatio: 1, updatedAt: 1 });
    const other = new SyncEngine(s.remote, OTHER);
    await other.bindUser();
    expect(await db().progress.count()).toBe(0);
    await s.engine.bindUser();
    expect((await db().progress.get("p"))!.bestPoints).toBe(10);
  });
});
