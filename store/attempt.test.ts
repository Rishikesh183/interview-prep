import { beforeEach, describe, expect, it } from "vitest";
import { AttemptSchema } from "@/lib/schema";
import { useAttemptStore } from "./attempt";

const store = () => useAttemptStore.getState();
const load = (over: Record<string, unknown> = {}, pristine = false) =>
  store().load(
    AttemptSchema.parse({ id: "a", problemId: "p", startedAt: 0, updatedAt: 0, ...over }),
    { pristine },
  );

beforeEach(() => store().clear());

describe("attempt timer", () => {
  it("accumulates elapsed time while running", () => {
    load();
    store().addElapsed(1000);
    store().addElapsed(1000);
    expect(store().meta!.elapsedMs).toBe(2000);
  });

  it("stops counting while paused and resumes after", () => {
    load();
    store().addElapsed(1000);
    store().toggleTimerPaused();
    expect(store().meta!.timerPaused).toBe(true);
    store().addElapsed(5000);
    expect(store().meta!.elapsedMs).toBe(1000);
    store().toggleTimerPaused();
    store().addElapsed(1000);
    expect(store().meta!.elapsedMs).toBe(2000);
  });

  it("doesn't start a brand-new attempt's clock before the first edit", () => {
    load({}, true);
    store().addElapsed(1000);
    expect(store().meta!.elapsedMs).toBe(0);
    store().setRequirements("functional", ["x"]);
    store().addElapsed(1000);
    expect(store().meta!.elapsedMs).toBe(1000);
  });

  it("stops for good once submitted", () => {
    load();
    store().submit();
    store().addElapsed(1000);
    expect(store().meta!.elapsedMs).toBe(0);
    expect(store().meta!.status).toBe("submitted");
  });

  it("restores a paused timer from a saved attempt", () => {
    load({ timerPaused: true, elapsedMs: 5000 });
    store().addElapsed(1000);
    expect(store().meta!.elapsedMs).toBe(5000);
  });
});
