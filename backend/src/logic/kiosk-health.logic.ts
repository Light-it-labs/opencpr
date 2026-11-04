import { differenceInMilliseconds, formatISO } from "date-fns";

import { logger } from "@/config";
import {
  KioskAlertsRepository,
  KiosksRepository,
  LocationsRepository,
} from "@/repositories";
import { isLocationMonitoredAt } from "@/utils";

import { Sentry } from "../config/sentry";
import { db, KIOSK_ALERT_STATES, KioskAlertState } from "../db";
import { KioskListItem, withKioskStatus } from "./kiosks.logic";

/** The sensor reports this while it is actually streaming readings. */
const SERIAL_READING = "reading";

/**
 * Reduces what KiosksLogic already derived to the one state worth alerting on.
 * Offline wins over a sensor problem: a silent kiosk says nothing about its
 * sensor, so blaming it would be noise. The thresholds stay in KiosksLogic.
 */
const toAlertState = (
  kiosk: Pick<KioskListItem, "online" | "serialStale" | "serialStatus">,
): KioskAlertState => {
  if (!kiosk.online) {
    return KIOSK_ALERT_STATES.offline;
  }

  if (kiosk.serialStale || kiosk.serialStatus !== SERIAL_READING) {
    return KIOSK_ALERT_STATES.sensor;
  }

  return KIOSK_ALERT_STATES.ok;
};

const TRANSITION_MESSAGES: Record<KioskAlertState, string> = {
  [KIOSK_ALERT_STATES.offline]: "is offline",
  [KIOSK_ALERT_STATES.sensor]: "has a sensor problem",
  [KIOSK_ALERT_STATES.ok]: "recovered",
};

/**
 * Heartbeats are not authenticated, so anyone posting them could flip a
 * kiosk's state back and forth and page on every flip. A heartbeat therefore
 * leaves alone a kiosk whose state changed less than this ago; the scheduled
 * check still judges it within minutes, so a real change is delayed, not lost.
 */
const HEARTBEAT_ALERT_MIN_INTERVAL_MS = 60 * 1000;

type KioskEvaluation = "skipped" | "unchanged" | "changed";

/**
 * Judges one kiosk and reports a change, for both the scheduled check and a
 * heartbeat. The kiosk's row is locked first, and its kiosk_alerts row read
 * after it, in the same order on both paths so they cannot deadlock: a check
 * racing a heartbeat for the same booth runs second and judges the newer data
 * against the state the first one stored, so a transition is reported once,
 * never twice and never backwards. The state is stored only after the event is
 * captured, in the same transaction, so a failure before the commit repeats
 * the event rather than losing it: alerting is at-least-once on purpose.
 * With a minimum interval, a kiosk whose state changed more recently than that
 * is skipped. Every query goes through the transaction, so an evaluation holds
 * one pooled connection, never two.
 */
const evaluate = async (
  kioskId: string,
  now: Date,
  minIntervalMs = 0,
): Promise<KioskEvaluation> =>
  await db.transaction(async (tx) => {
    const kiosk = await KiosksRepository.getForUpdate(kioskId, tx);
    const stored = await KioskAlertsRepository.getForUpdate(kioskId, tx);
    const from = stored?.state ?? null;
    const changedAt = stored ? (stored.updatedAt ?? stored.createdAt) : null;
    const location = kiosk?.locationId
      ? await LocationsRepository.get(kiosk.locationId, tx)
      : undefined;

    // Only the heartbeat path throttles. The cron takes one `now` before its
    // loop, so a heartbeat can store a change dated after it; without the
    // guard that negative difference would skip the catch-up check too.
    if (
      minIntervalMs > 0 &&
      changedAt &&
      differenceInMilliseconds(now, changedAt) < minIntervalMs
    ) {
      return "skipped";
    }

    // Skipping a kiosk, rather than muting its alerts, freezes its stored
    // state: a booth still down 10 minutes after opening raises exactly one
    // alert, and nothing fires when it is switched off at closing time or
    // while its firmware is being updated.
    if (!kiosk || !isLocationMonitoredAt(location, now)) {
      return "skipped";
    }

    const status = withKioskStatus(kiosk, now);

    if (status.inMaintenance) {
      return "skipped";
    }

    const to = toAlertState(status);

    if (from === to) {
      return "unchanged";
    }

    // A booth first seen healthy is worth recording but not announcing.
    const wasDown = from !== null && from !== KIOSK_ALERT_STATES.ok;
    const isDown = to !== KIOSK_ALERT_STATES.ok;

    if (from === null ? isDown : wasDown !== isDown) {
      const locationName = location?.name || "Unknown location";

      Sentry.captureMessage(
        `Kiosk ${locationName} (${kioskId}) ${TRANSITION_MESSAGES[to]}`,
        {
          level: to === KIOSK_ALERT_STATES.ok ? "info" : "warning",
          tags: {
            kioskId,
            locationId: kiosk.locationId ?? "none",
            locationName,
            from: from ?? "none",
            to,
          },
          // Sentry groups events by fingerprint, and every transition must
          // notify. A stable fingerprint would fold a repeat outage into the
          // old, possibly resolved or ignored issue and stay silent, so each
          // transition gets its own issue.
          fingerprint: ["kiosk-health", kioskId, to, formatISO(now)],
        },
      );
    }

    await KioskAlertsRepository.upsert({ kioskId, state: to }, tx);

    return "changed";
  });

export const KioskHealthLogic = {
  /**
   * The only way to notice a kiosk going offline, since a dead booth sends
   * nothing. States are always recorded; only a change is ever reported, so a
   * booth that stays broken is mentioned once, not every run. Kiosks are
   * judged one at a time, each in its own short transaction, so a retry after
   * a failure finds the ones already handled unchanged. Failures propagate so
   * BullMQ retries; the worker logs them once.
   */
  run: async () => {
    const kiosks = await KiosksRepository.list();
    const now = new Date();
    const outcomes: KioskEvaluation[] = [];

    // Sequential on purpose: kiosks never evaluated before lock the same index
    // gap, and two of them inserting side by side could deadlock.
    for (const { kioskId } of kiosks) {
      outcomes.push(await evaluate(kioskId, now));
    }

    const skipped = outcomes.filter((outcome) => outcome === "skipped").length;

    logger.info({
      action: "kiosk_health_checked",
      kiosks: kiosks.length,
      skipped,
      evaluated: kiosks.length - skipped,
      changes: outcomes.filter((outcome) => outcome === "changed").length,
    });
  },

  /**
   * Called right after a heartbeat is stored, so a sensor going down or coming
   * back is reported within seconds instead of at the next scheduled check.
   * The heartbeat is already saved and the scheduled check will catch up, so a
   * failure here is logged rather than returned to the kiosk, and a kiosk that
   * changed state in the last minute is left to that check.
   */
  checkKiosk: async (kioskId: string) => {
    try {
      await evaluate(kioskId, new Date(), HEARTBEAT_ALERT_MIN_INTERVAL_MS);
    } catch (error) {
      logger.error({
        action: "kiosk_health_heartbeat_check_failed",
        kioskId,
        error: error instanceof Error ? error.message : "unknown",
      });
      Sentry.captureException(error);
    }
  },
};
