import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosaver, type SaveStatus } from "./autosaver";

let value = { n: 0 };
let saved: number[];
let statuses: SaveStatus[];

const make = () =>
  createAutosaver({
    snapshot: () => value,
    save: async (v) => {
      saved.push(v.n);
    },
    onStatus: (s) => statuses.push(s),
  });

beforeEach(() => {
  vi.useFakeTimers();
  value = { n: 0 };
  saved = [];
  statuses = [];
});
afterEach(() => vi.useRealTimers());

describe("createAutosaver", () => {
  it("debounces saves by 1s", async () => {
    const saver = make();
    saver.markSaved();
    value = { n: 1 };
    saver.schedule();
    value = { n: 2 };
    saver.schedule();
    await vi.advanceTimersByTimeAsync(999);
    expect(saved).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(saved).toEqual([2]);
    expect(statuses.at(-1)).toBe("saved");
  });

  it("skips changes that don't alter the snapshot", async () => {
    const saver = make();
    saver.markSaved();
    saver.schedule();
    await vi.advanceTimersByTimeAsync(2000);
    expect(saved).toEqual([]);
    expect(statuses).toEqual([]);
  });

  it("saves at least every 5s under continuous changes", async () => {
    const saver = make();
    saver.markSaved();
    for (let i = 1; i <= 12; i++) {
      value = { n: i };
      saver.schedule();
      await vi.advanceTimersByTimeAsync(500);
    }
    expect(saved.length).toBeGreaterThanOrEqual(1);
    expect(saved[0]).toBeLessThanOrEqual(10);
  });

  it("flushes immediately on demand", async () => {
    const saver = make();
    value = { n: 7 };
    saver.schedule();
    await saver.flush();
    expect(saved).toEqual([7]);
    expect(saver.hasPending()).toBe(false);
  });

  it("reports errors", async () => {
    const saver = createAutosaver({
      snapshot: () => ({ n: 1 }),
      save: () => Promise.reject(new Error("quota")),
      onStatus: (s) => statuses.push(s),
    });
    await saver.flush();
    expect(statuses.at(-1)).toBe("error");
  });

  it("ignores fields outside changeKey for scheduling but still writes them", async () => {
    let state = { edit: 0, ticks: 0 };
    const writes: (typeof state)[] = [];
    const saver = createAutosaver({
      snapshot: () => state,
      save: async (v) => {
        writes.push(v);
      },
      onStatus: () => {},
      changeKey: ({ ticks: _t, ...rest }) => rest,
    });
    saver.markSaved();
    state = { edit: 0, ticks: 5 };
    saver.schedule();
    await vi.advanceTimersByTimeAsync(2000);
    expect(writes).toEqual([]);

    state = { edit: 1, ticks: 6 };
    saver.schedule();
    await vi.advanceTimersByTimeAsync(1000);
    expect(writes).toEqual([{ edit: 1, ticks: 6 }]);

    state = { edit: 1, ticks: 9 };
    await saver.flush();
    expect(writes.at(-1)).toEqual({ edit: 1, ticks: 9 });
  });

  it("doesn't let ignored-field updates postpone a pending save", async () => {
    let state = { edit: 0, ticks: 0 };
    const writes: (typeof state)[] = [];
    const saver = createAutosaver({
      snapshot: () => state,
      save: async (v) => {
        writes.push(v);
      },
      onStatus: () => {},
      changeKey: ({ ticks: _t, ...rest }) => rest,
    });
    saver.markSaved();
    state = { edit: 1, ticks: 0 };
    saver.schedule();
    for (let i = 1; i <= 3; i++) {
      await vi.advanceTimersByTimeAsync(400);
      state = { edit: 1, ticks: i };
      saver.schedule();
    }
    // 1.2s after the edit: saved 1s after the edit, not 1s after the last tick
    expect(writes).toHaveLength(1);
    expect(writes[0].edit).toBe(1);
  });
});
