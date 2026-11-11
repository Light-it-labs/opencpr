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
  pairedAt: z.iso.datetime().nullable(),
});

export const kiosksResponseSchema = z.object({ data: z.array(kioskSchema) });

export const kioskPairingCodeSchema = z.object({
  code: z.string(),
  expiresAt: z.iso.datetime(),
});

export const kioskPairingCodeResponseSchema = z.object({ data: kioskPairingCodeSchema });

export const createKioskPairingCodePayloadSchema = z.object({
  locationId: z.string().min(1, "Choose a location"),
});
