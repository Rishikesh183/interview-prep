import { describe, expect, it } from "vitest";
import type { TestCase } from "@/lib/schema";
import { scoreTests } from "./score";

const t = (id: string, kind: "core" | "bonus", weight = 1): TestCase => ({
  id,
  title: id,
  kind,
  weight,
  check: { hasNode: "cache" },
  failHint: "?",
});
const tests = [t("a", "core", 2), t("b", "core"), t("c", "bonus")];
const run = (...passed: boolean[]) =>
  tests.map((x, i) => ({ id: x.id, passed: passed[i], core: x.kind === "core" }));

describe("scoreTests", () => {
  it("weights the ratio and separates core from bonus", () => {
    expect(scoreTests(tests, run(true, false, true))).toEqual({
      corePassed: 1,
      coreTotal: 2,
      bonusPassed: 1,
      bonusTotal: 1,
      ratio: 3 / 4,
      solved: false,
    });
  });

  it("is solved when every core test passes, even if bonus fails", () => {
    expect(scoreTests(tests, run(true, true, false))).toMatchObject({ solved: true, ratio: 3 / 4 });
  });

  it("treats missing results as failed", () => {
    expect(scoreTests(tests, [])).toMatchObject({ corePassed: 0, ratio: 0, solved: false });
  });
});
