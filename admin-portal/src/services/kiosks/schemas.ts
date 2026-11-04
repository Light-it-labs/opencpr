import { z } from "zod";

export const kioskSchema = z.object({
  kioskId: z.string(),
  locationId: z.string().nullable(),
  serialStatus: z.string().nullable(),
  serialOkAt: z.iso.datetime().nullable(),
  baselineMm: z.number().nullable(),
  buildId: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime().nullable(),
  completions: z.number(),
  lastSeenAt: z.iso.datetime().nullable(),
  lastVisitAt: z.iso.datetime().nullable(),
  online: z.boolean(),
  serialStale: z.boolean(),
});

export const kiosksResponseSchema = z.object({ data: z.array(kioskSchema) });
