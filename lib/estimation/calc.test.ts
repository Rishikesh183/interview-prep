import { describe, expect, it } from "vitest";
import { EstimationInputSchema } from "@/lib/schema";
import { estimate, objectBytes } from "./calc";
import { formatBytes, formatCount } from "./format";

describe("estimate", () => {
  // URL shortener: ~100M new URLs/month ≈ 3.3M/day, 100:1 reads, 500 B rows, 5 years.
  const input = EstimationInputSchema.parse({
    dau: 3_300_000,
    writesPerUserPerDay: 1,
    readWriteRatio: 100,
    objectSize: 500,
    objectSizeUnit: "B",
    retentionYears: 5,
  });
  const out = estimate(input);

  it("computes QPS with the default peak factor of 3", () => {
    expect(out.writeQpsAvg).toBeCloseTo(38.19, 1);
    expect(out.writeQpsPeak).toBeCloseTo(114.58, 1);
    expect(out.readQpsAvg).toBeCloseTo(3819.4, 0);
    expect(out.readQpsPeak).toBeCloseTo(11458.3, 0);
  });

  it("computes storage per day and over retention", () => {
    expect(out.storagePerDayBytes).toBe(1_650_000_000);
    expect(out.storageTotalBytes).toBe(1_650_000_000 * 365 * 5);
  });

  it("computes bandwidth and 80/20 cache memory", () => {
    expect(out.ingressBytesPerSec).toBeCloseTo(19_097, 0);
    expect(out.egressBytesPerSec).toBeCloseTo(1_909_722, 0);
    expect(out.cacheMemoryBytes).toBe(330_000_000 * 0.2 * 500);
  });

  it("is all zeros for empty input", () => {
    const zero = estimate(EstimationInputSchema.parse({}));
    expect(Object.values(zero).every((v) => v === 0)).toBe(true);
  });

  it("converts size units", () => {
    expect(objectBytes({ objectSize: 2, objectSizeUnit: "MB" })).toBe(2_000_000);
    expect(objectBytes({ objectSize: 2, objectSizeUnit: "KB" })).toBe(2_000);
  });

  it("falls back to defaults for invalid input", () => {
    const parsed = EstimationInputSchema.parse({ dau: -5, peakFactor: 0 });
    expect(parsed.dau).toBe(0);
    expect(parsed.peakFactor).toBe(3);
  });
});

describe("formatting", () => {
  it.each([
    [0, "0"],
    [38.194, "38.2"],
    [1234, "1.23K"],
    [3_500_000, "3.5M"],
    [2e9, "2B"],
  ])("formatCount(%d) = %s", (n, s) => expect(formatCount(n)).toBe(s));

  it.each([
    [500, "500 B"],
    [1_650_000_000, "1.65 GB"],
    [3_011_250_000_000, "3.01 TB"],
  ])("formatBytes(%d) = %s", (n, s) => expect(formatBytes(n)).toBe(s));
});
