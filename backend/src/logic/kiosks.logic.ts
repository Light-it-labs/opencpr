import { randomBytes } from "node:crypto";
import { differenceInMilliseconds, isFuture } from "date-fns";

import { BadRequestError, ConflictError } from "@/exceptions";
import {
  KioskPairingCodesRepository,
  KiosksRepository,
  LocationsRepository,
} from "@/repositories";
import { KioskHeartbeat, KioskPair } from "@/schemas";
import { AuthenticatedKiosk } from "@/types";
import { hashToken, normalizePairingCode } from "@/utils";

import { db } from "../db";

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

const KIOSK_TOKEN_BYTES = 32;

/** One answer for unknown, used and expired codes, so none can be told apart. */
const invalidPairingCodeError = () =>
  new BadRequestError("This pairing code is invalid or has expired.");

type KioskRow = Omit<
  Awaited<ReturnType<typeof KiosksRepository.list>>[number],
  "tokenHash"
>;

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
  pair: async ({ code, kioskId }: KioskPair) => {
    const codeHash = hashToken(normalizePairingCode(code));
    const token = randomBytes(KIOSK_TOKEN_BYTES).toString("base64url");

    const location = await db.transaction(async (tx) => {
      const pairingCode = await KioskPairingCodesRepository.getForUpdate(
        codeHash,
        tx,
      );

      if (
        !pairingCode ||
        pairingCode.usedAt ||
        !isFuture(pairingCode.expiresAt) ||
        !(await KioskPairingCodesRepository.markUsed(pairingCode.id, tx))
      ) {
        return undefined;
      }

      await KiosksRepository.pair(
        {
          kioskId,
          locationId: pairingCode.locationId,
          tokenHash: hashToken(token),
        },
        tx,
      );

      return await LocationsRepository.get(pairingCode.locationId, tx);
    });

    if (!location) {
      throw invalidPairingCodeError();
    }

    return {
      token,
      location: { id: location.id, name: location.name, city: location.city },
    };
  },

  // A booth may pair under its browser's id before its board reports one; that first heartbeat moves the row.
  heartbeat: async (
    kiosk: AuthenticatedKiosk,
    reportedKioskId: string,
    data: KioskHeartbeat,
  ) => {
    // MySQL compares ids case-insensitively, so a change of case is no move.
    const isSameId =
      reportedKioskId.toLowerCase() === kiosk.kioskId.toLowerCase();

    if (
      !isSameId &&
      !(await KiosksRepository.rekey(kiosk.kioskId, reportedKioskId))
    ) {
      throw new ConflictError({
        message: "Another kiosk already uses this id. Pair this kiosk again.",
      });
    }

    const kioskId = isSameId ? kiosk.kioskId : reportedKioskId;

    // An omitted status is stored as unknown, never left as it was: otherwise a
    // heartbeat without one would keep a stored "maintenance" alive forever
    // while refreshing the last-seen time the 20-minute cap is measured from.
    await KiosksRepository.recordHeartbeat(kioskId, {
      ...data,
      serialStatus: data.serialStatus ?? null,
    });

    return kioskId;
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
      .map(({ tokenHash: _tokenHash, ...kiosk }) => {
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
