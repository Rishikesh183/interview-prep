import { z } from "zod";

export const CategorySchema = z.enum([
  "clients",
  "edge",
  "compute",
  "storage",
  "messaging",
  "infra",
  "annotation",
]);
export type Category = z.infer<typeof CategorySchema>;

/** Rough per-instance numbers. Used by the linter now and the simulation later. */
export const CapacitySchema = z.object({
  rps: z.number().optional(),
  readsPerSec: z.number().optional(),
  writesPerSec: z.number().optional(),
  opsPerSec: z.number().optional(),
  connections: z.number().optional(),
  mbPerSec: z.number().optional(),
});
export type Capacity = z.infer<typeof CapacitySchema>;
