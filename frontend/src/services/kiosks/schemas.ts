import { z } from "zod";

/**
 * Sent as the serial status while the booth is down on purpose (firmware being
 * flashed): the backend holds its alerts until a beat reports anything else.
 * A heartbeat value only, never one of the serial link's own statuses.
 */
export const KIOSK_MAINTENANCE_STATUS = "maintenance";

/** What a booth reports so a broken one is visible without walking to it. */
export const kioskHeartbeatSchema = z.object({
  locationId: z.string().nullable(),
  serialStatus: z.string().nullable(),
  serialOkAt: z.string().nullable(),
  baselineMm: z.number().nullable(),
  buildId: z.string(),
});
