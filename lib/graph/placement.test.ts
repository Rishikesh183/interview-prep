import { describe, expect, it } from "vitest";
import { findFreePosition, SLOT } from "./placement";

const rect = (x: number, y: number) => ({ x, y, width: SLOT.width, height: SLOT.height });

describe("findFreePosition", () => {
  it("uses the desired spot when it is free", () => {
    expect(findFreePosition({ x: 0, y: 0 }, [rect(1000, 1000)])).toEqual({ x: 0, y: 0 });
  });

  it("moves to a neighbouring slot when the spot is taken", () => {
    const p = findFreePosition({ x: 0, y: 0 }, [rect(0, 0)]);
    expect(p).not.toEqual({ x: 0, y: 0 });
    expect(Math.abs(p.x) <= SLOT.width + SLOT.gap && Math.abs(p.y) <= SLOT.height + SLOT.gap).toBe(
      true,
    );
  });

  it("never returns a spot overlapping existing nodes", () => {
    const occupied = [rect(0, 0)];
    for (let i = 0; i < 10; i++) {
      const p = findFreePosition({ x: 0, y: 0 }, occupied);
      for (const r of occupied) {
        const clear =
          p.x >= r.x + r.width ||
          r.x >= p.x + SLOT.width ||
          p.y >= r.y + r.height ||
          r.y >= p.y + SLOT.height;
        expect(clear).toBe(true);
      }
      occupied.push(rect(p.x, p.y));
    }
  });
});
