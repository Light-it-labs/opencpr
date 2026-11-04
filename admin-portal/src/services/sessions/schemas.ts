import { z } from "zod";

import { createPaginatedResponseSchema } from "@/services/schemas";

export const sessionSchema = z.object({
  id: z.number(),
  publicId: z.string(),
  registrationId: z.string().nullable(),
  locationId: z.string(),
  kioskId: z.string().nullable(),
  buildId: z.string().nullable(),
  participantId: z.string().nullable(),
  totalCompressions: z.number(),
  totalFullCompressions: z.number().nullable(),
  totalFullRebounds: z.number().nullable(),
  averageCompressionEndDepthMm: z.number().nullable(),
  compressionsOnBpmRange: z.number().nullable(),
  averageBpm: z.number().nullable(),
  score: z.number(),
  createdAt: z.iso.datetime(),
  location: z.object({ id: z.string(), name: z.string() }).nullable(),
  participant: z
    .object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string().nullable(),
      email: z.string(),
    })
    .nullable(),
});

export const compressionSchema = z.object({
  id: z.number(),
  timestampMs: z.number().nullable(),
  startDepthMm: z.number(),
  endDepthMm: z.number(),
});

export const sessionDetailSchema = sessionSchema.extend({
  compressions: z.array(compressionSchema),
});

export const sessionsResponseSchema = createPaginatedResponseSchema(sessionSchema);

export const sessionDetailResponseSchema = z.object({ data: sessionDetailSchema });

export const sessionsFiltersSchema = z.object({
  page: z.number(),
  locationId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  sort: z.string().optional(),
});
