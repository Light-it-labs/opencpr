import { useCallback, useEffect, useRef } from "react";

import { KIOSK_MAINTENANCE_STATUS, useSendKioskHeartbeat } from "@/services/kiosks";
import {
  ensureKioskId,
  useKioskToken,
  useLastBaselineMm,
  useLastSerialOkAt,
  useLastSerialStatus,
} from "@/stores";

const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000;
/**
 * The first beat waits for the board to report, since beating at once would
 * send no sensor status, under a minted ID the board's own is about to replace
 * — an alert, and a phantom kiosk. A booth with no board answering (manual
 * mode, no port yet) beats anyway after this long.
 */
const FIRST_BEAT_FALLBACK_MS = 15_000;
/**
 * A sensor status change is reported without waiting for the next interval,
 * but a fault only once it has held this long: brief blips and the silence of
 * a calibration must not raise an alert. Recovery is reported at once.
 */
const FAULT_CONFIRM_MS = 10_000;
/** Floor between beats, so a flapping link cannot flood the endpoint. */
const MIN_BEAT_GAP_MS = 5_000;
const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Which build the kiosk last reloaded to reach. If it comes back still not
// running that build the server is serving stale HTML, and reloading again
// would only spin — so the attempt is recorded before the reload, not after.
const UPDATE_ATTEMPT_KEY = "cpr-kiosk-update-attempt";

const readAttemptedBuildId = () => {
  try {
    return window.sessionStorage.getItem(UPDATE_ATTEMPT_KEY);
  } catch {
    return null;
  }
};

const rememberUpdateAttempt = (buildId: string) => {
  try {
    window.sessionStorage.setItem(UPDATE_ATTEMPT_KEY, buildId);
  } catch {
    // No storage. The only cost is that a stale server is retried.
  }
};

/**
 * Reports this booth's health, and picks up a new deploy without anyone
 * reaching the machine.
 *
 * Both halves are enhancements and fail silently: a kiosk with no network keeps
 * running the build it has and simply stops appearing online.
 */
export const useKioskMonitor = ({
  isIdle,
  isMaintenance,
}: {
  isIdle: boolean;
  /**
   * The booth is down on purpose (firmware being flashed). Beats report it as
   * the serial status, which holds the backend's alerts until a beat reports
   * anything else.
   */
  isMaintenance: boolean;
}) => {
  const kioskToken = useKioskToken();
  const lastSerialStatus = useLastSerialStatus();
  const lastSerialOkAt = useLastSerialOkAt();
  const lastBaselineMm = useLastBaselineMm();

  const { mutate: sendHeartbeat } = useSendKioskHeartbeat();

  // Read through a ref so changing values never restart the interval.
  const payloadRef = useRef({
    lastSerialStatus,
    lastSerialOkAt,
    lastBaselineMm,
    isMaintenance,
  });
  payloadRef.current = {
    lastSerialStatus,
    lastSerialOkAt,
    lastBaselineMm,
    isMaintenance,
  };

  // What the server last heard, and when, so a status change is reported once.
  const reportedStatusRef = useRef<string | null>(null);
  const lastBeatAtRef = useRef(0);

  const beat = useCallback(() => {
    const current = payloadRef.current;

    reportedStatusRef.current = current.lastSerialStatus;
    lastBeatAtRef.current = Date.now();

    sendHeartbeat({
      // Minted here rather than during render, where writing to the store is
      // illegal and blows the update depth. Becomes the board's ID once it reports one.
      kioskId: ensureKioskId(),
      // The port is closed on purpose, so the link's own status means nothing
      // here. Any other status ends maintenance on the backend.
      serialStatus: current.isMaintenance ? KIOSK_MAINTENANCE_STATUS : current.lastSerialStatus,
      serialOkAt: current.lastSerialOkAt,
      baselineMm: current.lastBaselineMm,
      buildId: __BUILD_ID__,
    });
  }, [sendHeartbeat]);

  // Only a paired kiosk may beat; the API refuses anything else. Depended on,
  // not read through the ref, so pairing reports promptly.
  const isSetUp = Boolean(kioskToken);

  useEffect(() => {
    if (!isSetUp) {
      return;
    }

    const timer = window.setInterval(beat, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [beat, isSetUp]);

  // Health is not carried over a reload, so the first healthy read is the board
  // speaking — and its ready frame has adopted the board's ID by then.
  const hasBoardReported = lastSerialStatus === "reading";
  const hasSentFirstBeatRef = useRef(false);

  useEffect(() => {
    // Maintenance beats on its own, below. Leaving it starts over, so the beat
    // that ends it waits for the newly flashed board like any first one.
    if (!isSetUp || isMaintenance) {
      hasSentFirstBeatRef.current = false;

      return;
    }

    if (hasSentFirstBeatRef.current) {
      return;
    }

    const sendFirstBeat = () => {
      hasSentFirstBeatRef.current = true;
      beat();
    };

    if (hasBoardReported) {
      sendFirstBeat();

      return;
    }

    const fallback = window.setTimeout(sendFirstBeat, FIRST_BEAT_FALLBACK_MS);

    return () => {
      window.clearTimeout(fallback);
    };
  }, [beat, hasBoardReported, isMaintenance, isSetUp]);

  // Entering maintenance is reported at once, without waiting for the board:
  // the port is closed on purpose, and the backend must hold its alerts before
  // the next interval beat would reach it.
  useEffect(() => {
    if (!isSetUp || !isMaintenance) {
      return;
    }

    const gapMs = lastBeatAtRef.current + MIN_BEAT_GAP_MS - Date.now();
    const timer = window.setTimeout(beat, Math.max(gapMs, 0));

    return () => {
      window.clearTimeout(timer);
    };
  }, [beat, isMaintenance, isSetUp]);

  // Declared after the first beat so a change that beat already carried is
  // seen as reported. Before it, the first beat will carry whatever is current.
  useEffect(() => {
    if (
      !isSetUp ||
      !hasSentFirstBeatRef.current ||
      lastSerialStatus === reportedStatusRef.current
    ) {
      return;
    }

    const confirmMs = lastSerialStatus === "reading" ? 0 : FAULT_CONFIRM_MS;
    const gapMs = lastBeatAtRef.current + MIN_BEAT_GAP_MS - Date.now();

    const timer = window.setTimeout(
      () => {
        // An interval beat may have carried it in the meantime.
        if (payloadRef.current.lastSerialStatus !== reportedStatusRef.current) {
          beat();
        }
      },
      Math.max(confirmMs, gapMs, 0),
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [beat, isSetUp, lastSerialStatus]);

  // A new deploy changes the build id in version.json. Reloading is held until
  // the kiosk is idle: doing it mid-session would destroy that participant's
  // run and drop the serial connection.
  const pendingBuildIdRef = useRef<string | null>(null);

  // Read through a ref so the check can see the current screen without the
  // interval restarting every time the booth navigates.
  const isIdleRef = useRef(isIdle);
  isIdleRef.current = isIdle;

  const applyUpdate = useCallback(() => {
    const buildId = pendingBuildIdRef.current;

    if (!buildId || readAttemptedBuildId() === buildId) {
      return;
    }

    rememberUpdateAttempt(buildId);
    window.history.replaceState(window.history.state, "", "/");
    window.location.reload();
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const { buildId } = (await response.json()) as { buildId?: string };
        if (!buildId || buildId === __BUILD_ID__) {
          return;
        }

        pendingBuildIdRef.current = buildId;

        // A booth left on the attract screen never navigates, so waiting for it
        // to arrive there would leave the deploy unclaimed until the next
        // participant finishes a run.
        if (isIdleRef.current) {
          applyUpdate();
        }
      } catch {
        // Offline. Keep running what we have.
      }
    };

    void check();
    const timer = window.setInterval(() => {
      void check();
    }, VERSION_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [applyUpdate]);

  useEffect(() => {
    if (isIdle) {
      applyUpdate();
    }
  }, [isIdle, applyUpdate]);
};
