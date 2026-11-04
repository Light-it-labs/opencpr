import { differenceInMilliseconds } from "date-fns";

import { BadRequestError } from "@/exceptions";
import { KiosksRepository, LocationsRepository } from "@/repositories";
import { KioskHeartbeat } from "@/schemas";

/**
 * A kiosk heartbeats every couple of minutes, so two consecutive misses is a
 * fair sign something is wrong rather than merely slow.
 */
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

/** Beyond this the sensor has not been seen for long enough to be suspicious. */
const SERIAL_STALE_MS = 30 * 60 * 1000;

/**
 * What the kiosk's maintenance page reports as its serial status while the
 * booth's firmware is being updated, so the health check leaves it alone.
 */
export const KIOSK_MAINTENANCE_STATUS = "maintenance";

/**
 * How long a maintenance heartbeat silences a kiosk. The page re-sends one
 * every couple of minutes; a booth that stops reporting mid-update is judged
 * as usual after this, so a failed update still gets reported.
 */
const KIOSK_MAINTENANCE_MAX_MS = 20 * 60 * 1000;

type KioskRow = Awaited<ReturnType<typeof KiosksRepository.list>>[number];

/**
 * What the board and the health check both read off a stored kiosk, derived in
 * one place so the alert and the status page cannot disagree.
 */
export const withKioskStatus = (kiosk: KioskRow, now: Date) => {
  const lastSeenAt = kiosk.updatedAt ?? kiosk.createdAt;
  const serialOkAt = kiosk.serialOkAt;

  return {
    ...kiosk,
    lastSeenAt,
    online: Boolean(
      lastSeenAt &&
      differenceInMilliseconds(now, lastSeenAt) < ONLINE_WINDOW_MS,
    ),
    // Distinct from `online`: a kiosk can be up and reporting while its
    // sensor has been silent for an hour, which is the interesting case.
    serialStale:
      !serialOkAt ||
      differenceInMilliseconds(now, serialOkAt) > SERIAL_STALE_MS,
    // Any normal heartbeat overwrites the serial status, ending it at once.
    inMaintenance: Boolean(
      kiosk.serialStatus === KIOSK_MAINTENANCE_STATUS &&
      lastSeenAt &&
      differenceInMilliseconds(now, lastSeenAt) < KIOSK_MAINTENANCE_MAX_MS,
    ),
  };
};

export const KiosksLogic = {
  /**
   * A known location is the price of admission: the kiosk mints its own id, so
   * without this every browser that opened the app became a kiosk.
   */
  heartbeat: async (kioskId: string, data: KioskHeartbeat) => {
    if (!data.locationId) {
      throw new BadRequestError(
        "A kiosk must be set up with a location before it can report.",
      );
    }

    const location = await LocationsRepository.get(data.locationId);

    if (!location) {
      throw new BadRequestError("Unknown location. Set this kiosk up again.");
    }

    // An omitted status is stored as unknown, never left as it was: otherwise a
    // heartbeat without one would keep a stored "maintenance" alive forever
    // while refreshing the last-seen time the 20-minute cap is measured from.
    await KiosksRepository.upsert(kioskId, {
      ...data,
      serialStatus: data.serialStatus ?? null,
    });
  },

  /**
   * Undefined locationIds lists every kiosk. A kiosk with no location belongs
   * to no location, so any limit leaves it out.
   */
  list: async (locationIds?: string[]) => {
    const [kiosks, sessionStatsByKiosk] = await Promise.all([
      KiosksRepository.list(),
      KiosksRepository.getSessionStatsByKiosk(),
    ]);
    const now = new Date();

    return kiosks
      .filter(
        (kiosk) =>
          !locationIds ||
          (kiosk.locationId !== null && locationIds.includes(kiosk.locationId)),
      )
      .map((kiosk) => {
        const stats = sessionStatsByKiosk.get(kiosk.kioskId);

        return {
          ...withKioskStatus(kiosk, now),
          completions: stats?.completions ?? 0,
          lastVisitAt: stats?.lastVisitAt ?? null,
        };
      });
  },
};

export type KioskListItem = Awaited<
  ReturnType<typeof KiosksLogic.list>
>[number];
