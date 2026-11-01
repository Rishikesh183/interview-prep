import { z } from "zod";

export const HttpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "WS", "RPC"]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const PaginationSchema = z.enum(["none", "offset", "cursor"]);

export const ApiEndpointSchema = z.object({
  id: z.string().min(1),
  /** Server endpoint owner, or browser component/adapter for a local RPC contract. */
  ownerNodeId: z.string().min(1),
  method: HttpMethodSchema,
  path: z.string(),
  request: z.string().optional(),
  response: z.string().optional(),
  statusCodes: z.string().optional(),
  auth: z.boolean(),
  idempotent: z.boolean().optional(),
  pagination: PaginationSchema.optional(),
  rateLimited: z.boolean().optional(),
  note: z.string().optional(),
});
export type ApiEndpoint = z.infer<typeof ApiEndpointSchema>;
