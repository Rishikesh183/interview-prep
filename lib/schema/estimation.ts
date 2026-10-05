import { z } from "zod";

export const SizeUnitSchema = z.enum(["B", "KB", "MB"]);
export type SizeUnit = z.infer<typeof SizeUnitSchema>;

const nonNegative = (def: number) => z.number().min(0).catch(def).default(def);

export const EstimationInputSchema = z.object({
  dau: nonNegative(0),
  writesPerUserPerDay: nonNegative(0),
  /** Reads per write. */
  readWriteRatio: nonNegative(1),
  objectSize: nonNegative(0),
  objectSizeUnit: SizeUnitSchema.catch("KB").default("KB"),
  retentionYears: nonNegative(5),
  peakFactor: z.number().min(1).catch(3).default(3),
});
export type EstimationInput = z.infer<typeof EstimationInputSchema>;

export const EstimationOutputSchema = z.object({
  writesPerDay: z.number(),
  readsPerDay: z.number(),
  writeQpsAvg: z.number(),
  writeQpsPeak: z.number(),
  readQpsAvg: z.number(),
  readQpsPeak: z.number(),
  storagePerDayBytes: z.number(),
  storageTotalBytes: z.number(),
  ingressBytesPerSec: z.number(),
  egressBytesPerSec: z.number(),
  cacheMemoryBytes: z.number(),
});
export type EstimationOutput = z.infer<typeof EstimationOutputSchema>;

export const EstimationSchema = EstimationInputSchema.extend({
  notes: z.string().catch("").default(""),
  outputs: EstimationOutputSchema.optional(),
});
export type Estimation = z.infer<typeof EstimationSchema>;
