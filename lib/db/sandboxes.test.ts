import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { node } from "@/test/fixtures";
import { db } from "./dexie";
import {
  createSandbox,
  deleteSandbox,
  ensureSandbox,
  listSandboxes,
  loadSandbox,
  MAX_SANDBOXES,
  renameSandbox,
  saveSandbox,
} from "./sandboxes";

const graph = { nodes: [], edges: [] };

beforeEach(async () => {
  await db().sandbox.clear();
});

describe("sandboxes", () => {
  it("creates the first sandbox once, even with concurrent callers", async () => {
    await Promise.all([ensureSandbox(), ensureSandbox()]);
    expect((await listSandboxes()).map((s) => s.name)).toEqual(["Sandbox 1"]);
  });

  it("keeps a sandbox saved before names existed, as the first tab", async () => {
    await db().sandbox.put({ id: "default", graph, apis: [], updatedAt: 1 });
    await ensureSandbox();
    await createSandbox();
    expect((await listSandboxes()).map((s) => [s.id, s.name])).toEqual([
      ["default", "Sandbox 1"],
      [expect.any(String), "Sandbox 2"],
    ]);
  });

  it(`refuses to create more than ${MAX_SANDBOXES}`, async () => {
    await ensureSandbox();
    for (let i = 1; i < MAX_SANDBOXES; i++) await createSandbox();
    await expect(createSandbox()).rejects.toThrow(/at most 5/);
    const tabs = await listSandboxes();
    expect(tabs).toHaveLength(MAX_SANDBOXES);
    expect(tabs.map((t) => t.name)).toEqual([1, 2, 3, 4, 5].map((n) => `Sandbox ${n}`));
  });

  it("frees a slot on delete and picks an unused default name", async () => {
    await ensureSandbox();
    const two = await createSandbox();
    await createSandbox();
    await deleteSandbox(two.id);
    expect((await createSandbox()).name).toBe("Sandbox 4");
  });

  it("renames and saves without clobbering each other", async () => {
    const s = await createSandbox("Draft");
    await renameSandbox(s.id, "  Chat app  ");
    await saveSandbox(s.id, {
      graph: { nodes: [node("n1", "cache", "Redis")], edges: [] },
      apis: [],
    });
    expect((await listSandboxes())[0].name).toBe("Chat app");
    expect((await loadSandbox(s.id))?.graph.nodes).toHaveLength(1);
  });

  it("doesn't resurrect a deleted sandbox on a late save", async () => {
    const s = await createSandbox();
    await deleteSandbox(s.id);
    await saveSandbox(s.id, { graph, apis: [] });
    expect(await listSandboxes()).toEqual([]);
  });
});
