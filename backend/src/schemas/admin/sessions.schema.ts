import z from "zod";

import { paginationQuerySchema } from "../pagination";
import { dateRangeFields, sortParamSchema } from "./common.schema";

export const adminSessionSortFields = [
  "createdAt",
  "score",
  "totalCompressions",
  "averageBpm",
  "averageCompressionEndDepthMm",
  "location",
  "participant",
] as const;

export type AdminSessionSortField = (typeof adminSessionSortFields)[number];

export const listAdminSessionsQuerySchema = paginationQuerySchema.extend({
  locationId: z.uuid().optional(),
  ...dateRangeFields,
  search: z.string().trim().min(1).optional(),
  sort: sortParamSchema(adminSessionSortFields, {
    field: "createdAt",
    direction: "desc",
  }),
});

export type ListAdminSessionsQuery = z.infer<
  typeof listAdminSessionsQuerySchema
>;
