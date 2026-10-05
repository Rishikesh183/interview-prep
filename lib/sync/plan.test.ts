import { describe, expect, it } from "vitest";
import { planSync } from "./plan";

const s = (id: string, updatedAt: number) => ({ id, updatedAt });

describe("planSync (last-write-wins)", () => {
  it("pushes local-newer, pulls remote-newer, skips equal", () => {
    const plan = planSync(
      [s("a", 2), s("b", 1), s("c", 5)],
      [s("a", 1), s("b", 2), s("c", 5)],
      new Set(),
      new Set(),
    );
    expect(plan).toEqual({ push: ["a"], pull: ["b"], deleteRemote: [], deleteLocal: [] });
  });

  it("pushes attempts only on this device that were never synced", () => {
    expect(planSync([s("new", 1)], [], new Set(), new Set()).push).toEqual(["new"]);
  });

  it("drops local attempts that were synced before but are gone remotely (deleted elsewhere)", () => {
    expect(planSync([s("gone", 1)], [], new Set(["gone"]), new Set()).deleteLocal).toEqual([
      "gone",
    ]);
  });

  it("pulls remote-only attempts unless deleted here", () => {
    const plan = planSync([], [s("other", 1), s("dead", 1)], new Set(), new Set(["dead"]));
    expect(plan.pull).toEqual(["other"]);
    expect(plan.deleteRemote).toEqual(["dead"]);
  });
});
