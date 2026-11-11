import { z } from "zod";

/**
 * Sent as the serial status while the booth is down on purpose (firmware being
 * flashed): the backend holds its alerts until a beat reports anything else.
 * A heartbeat value only, never one of the serial link's own statuses.
 */
export const KIOSK_MAINTENANCE_STATUS = "maintenance";

/** What a booth reports so a broken one is visible without walking to it. */
export const kioskHeartbeatSchema = z.object({
  serialStatus: z.string().nullable(),
  serialOkAt: z.string().nullable(),
  baselineMm: z.number().nullable(),
  buildId: z.string(),
});

export const PAIRING_CODE_LENGTH = 8;

export const normalizePairingCode = (code: string) => {
  return code.replace(/[\s-]/g, "").toUpperCase();
};

export const pairedLocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
});

export const pairKioskSchema = z.object({
  code: z.string(),
  kioskId: z.string(),
});

export const kioskPairingSchema = z.object({
  token: z.string(),
  location: pairedLocationSchema,
});
