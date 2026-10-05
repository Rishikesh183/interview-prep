import type { EstimationInput, EstimationOutput, SizeUnit } from "@/lib/schema";

export const SECONDS_PER_DAY = 86_400;
const DAYS_PER_YEAR = 365;
/** 80/20 rule: cache the hottest 20% of a day's reads. */
const HOT_FRACTION = 0.2;

const UNIT_BYTES: Record<SizeUnit, number> = { B: 1, KB: 1_000, MB: 1_000_000 };

export function objectBytes(input: Pick<EstimationInput, "objectSize" | "objectSizeUnit">): number {
  return input.objectSize * UNIT_BYTES[input.objectSizeUnit];
}

export function estimate(input: EstimationInput): EstimationOutput {
  const bytes = objectBytes(input);
  const writesPerDay = input.dau * input.writesPerUserPerDay;
  const readsPerDay = writesPerDay * input.readWriteRatio;
  const writeQpsAvg = writesPerDay / SECONDS_PER_DAY;
  const readQpsAvg = readsPerDay / SECONDS_PER_DAY;
  const storagePerDayBytes = writesPerDay * bytes;

  return {
    writesPerDay,
    readsPerDay,
    writeQpsAvg,
    writeQpsPeak: writeQpsAvg * input.peakFactor,
    readQpsAvg,
    readQpsPeak: readQpsAvg * input.peakFactor,
    storagePerDayBytes,
    storageTotalBytes: storagePerDayBytes * DAYS_PER_YEAR * input.retentionYears,
    ingressBytesPerSec: writeQpsAvg * bytes,
    egressBytesPerSec: readQpsAvg * bytes,
    cacheMemoryBytes: readsPerDay * HOT_FRACTION * bytes,
  };
}

/** Formulas shown next to each output so the user learns them. */
export const FORMULAS: Record<keyof EstimationOutput, string> = {
  writesPerDay: "DAU × writes per user per day",
  readsPerDay: "writes/day × read:write ratio",
  writeQpsAvg: "writes/day ÷ 86,400 s",
  writeQpsPeak: "avg write QPS × peak factor",
  readQpsAvg: "reads/day ÷ 86,400 s",
  readQpsPeak: "avg read QPS × peak factor",
  storagePerDayBytes: "writes/day × object size",
  storageTotalBytes: "storage/day × 365 × retention years",
  ingressBytesPerSec: "avg write QPS × object size",
  egressBytesPerSec: "avg read QPS × object size",
  cacheMemoryBytes: "20% × reads/day × object size (80/20 rule)",
};
