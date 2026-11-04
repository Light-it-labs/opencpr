import z from "zod";

import { paginationQuerySchema } from "../pagination";
import { dateRangeFields, sortParamSchema } from "./common.schema";

export const adminParticipantSortFields = [
  "lastName",
  "firstName",
  "email",
  "sessionsCount",
  "bestScore",
  "lastPlayedAt",
  "createdAt",
] as const;

export type AdminParticipantSortField =
  (typeof adminParticipantSortFields)[number];

export const listAdminParticipantsQuerySchema = paginationQuerySchema.extend({
  locationId: z.uuid().optional(),
  search: z.string().trim().min(1).optional(),
  sort: sortParamSchema(adminParticipantSortFields, {
    field: "lastPlayedAt",
    direction: "desc",
  }),
});

export type ListAdminParticipantsQuery = z.infer<
  typeof listAdminParticipantsQuerySchema
>;

/** Filters the export by where and when a run was played, not by who. */
export const exportAdminParticipantsQuerySchema = z.object({
  locationId: z.uuid().optional(),
  ...dateRangeFields,
});

export type ExportAdminParticipantsQuery = z.infer<
  typeof exportAdminParticipantsQuerySchema
>;
