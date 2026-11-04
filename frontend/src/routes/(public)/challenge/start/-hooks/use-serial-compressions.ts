import { useCallback, useEffect, useRef, useState } from "react";

import {
  type CalibrationResult,
  getSerialLinkState,
  recalibrateSerialLink,
  sendSerialCommand,
  subscribeToSerialLink,
} from "@/hooks";
import { type CprCompression, useSerialStatus } from "@/stores";
import { SERIAL_COMMANDS } from "@/utils";

type UseSerialCompressionsParams = {
  /**
   * Listen to the link and hold off idle recalibration. Deliberately true
   * before the countdown ends, so the run starts on clean tracking and the
   * "sensor ready" answer lands while the overlay asks for hands off the chest.
   */
  connected: boolean;
  /** Append frames. False until the countdown finishes. */
  recording: boolean;
  /** Stop appending once the session is full. */
  max: number;
  onError?: (message: string, code?: "sensor" | "calibration") => void;
  /**
   * The sensor is ready for this run, carrying its baseline and whether it can
   * be trusted: once as the run starts — from the trusted baseline the board
   * already holds, from the idle calibration it was finishing, or from the one
   * taken during the countdown when there was none — and again if the board
   * reboots mid-run. A false baselineOk is the whole story for that boot: the
   * device does not also send an error frame, so this must not be treated as
   * plain success. A participant's recalibration answers through `recalibrate`
   * instead.
   */
  onReady?: (baselineMm: number, baselineOk: boolean) => void;
};

/**
 * One run's view of the sensor. The port itself belongs to useSerialLink,
 * which reads it on every screen; this only listens while a run is on, and
 * turns frames into the run's readings.
 */
export const useSerialCompressions = ({
  connected,
  max,
  onError,
  onReady,
  recording,
}: UseSerialCompressionsParams) => {
  const [readings, setReadings] = useState<CprCompression[]>([]);
  const status = useSerialStatus();
  /** Live depth between compressions, for the operator-facing readout. */
  const [liveDepthMm, setLiveDepthMm] = useState(0);

  const stoppedRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const recordingRef = useRef(recording);
  recordingRef.current = recording;
  /**
   * Calibrations this run (or its participant) is awaiting. Their ready and
   * error frames are reported through the request's outcome, not as frames.
   */
  const awaitingCalibrationRef = useRef(0);
  /** Still to announce "sensor ready", or the failure, for this run's start. */
  const awaitingReadyRef = useRef(false);
  /** The request the participant last awaited, which reports itself. */
  const participantRequestRef = useRef<Promise<CalibrationResult> | null>(null);

  // Nothing to wait for: the link itself keeps running for the next screen.
  const stop = useCallback(() => {
    stoppedRef.current = true;
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
  }, []);

  const resetReadings = useCallback(() => {
    setReadings([]);
    void sendSerialCommand(SERIAL_COMMANDS.resetSession);
  }, []);

  useEffect(() => {
    if (!connected) {
      return;
    }

    stoppedRef.current = false;
    // The board is not rebooted for a run any more, so "sensor ready" is
    // announced from what the link already knows, once it knows it.
    awaitingReadyRef.current = true;
    participantRequestRef.current = null;
    let cancelled = false;
    let askedForBaseline = false;

    const reportStart = (report: () => void) => {
      awaitingReadyRef.current = false;
      report();
    };

    /** Awaits a calibration's own outcome, then settles the start with it. */
    const follow = (request: Promise<CalibrationResult>) => {
      awaitingCalibrationRef.current += 1;

      void request.then((result) => {
        awaitingCalibrationRef.current -= 1;

        if (cancelled || stoppedRef.current || !awaitingReadyRef.current) {
          return;
        }

        // The participant pressed Recalibrate meanwhile and joined this one:
        // their toast reports it, and it settles the start too.
        if (participantRequestRef.current === request) {
          awaitingReadyRef.current = result === "lost";

          return;
        }

        // Lost with the link: the banner speaks, and the rebooted board's own
        // ready frame starts this over, so it may be asked for again.
        if (result === "lost") {
          askedForBaseline = false;

          return;
        }

        settleStart(`Calibration ${result}`);
      });
    };

    /**
     * Settles how this run starts: on the trusted baseline the board holds,
     * on the outcome of the calibration in flight, or on one asked for during
     * the countdown. Never sends 'C' once the countdown is over: a baseline
     * still missing or untrusted by then is reported, once, as a failure.
     */
    const settleStart = (reason = "Calibration not settled before the run") => {
      if (
        !awaitingReadyRef.current ||
        awaitingCalibrationRef.current > 0 ||
        cancelled ||
        stoppedRef.current
      ) {
        return;
      }

      const { baseline, calibrating, reading } = getSerialLinkState();

      // Not reading: the fault banner speaks instead, and this runs again on
      // the first healthy heartbeat.
      if (!reading) {
        return;
      }

      // An idle calibration still in flight as the run began: joined, so
      // nothing more is sent. It is the run's one attempt; a refusal must not
      // be followed by a second 'C' of our own.
      if (calibrating) {
        askedForBaseline = true;
        follow(recalibrateSerialLink());

        return;
      }

      // A trusted baseline, even one kept after a refused recalibration, is
      // good to start on.
      if (baseline?.ok) {
        reportStart(() => {
          onReadyRef.current?.(baseline.mm, true);
        });

        return;
      }

      if (askedForBaseline || recordingRef.current) {
        reportStart(() => {
          onErrorRef.current?.(reason, "calibration");
        });

        return;
      }

      // No baseline heard since the page loaded, or only one the board flagged
      // as bad (it booted with the chest open). The countdown is asking for
      // hands off the chest, so take one now, once.
      askedForBaseline = true;
      follow(recalibrateSerialLink());
    };

    const unsubscribe = subscribeToSerialLink(
      (event) => {
        if (stoppedRef.current) {
          return;
        }

        if (event.kind === "lost") {
          if (event.reason === "error" && event.detail) {
            onErrorRef.current?.(event.detail);
          }

          return;
        }

        const { frame } = event;

        if (frame.type === "error") {
          // A refusal this hook is awaiting is reported through its
          // request's outcome. Any other calibration error (an older board's
          // failed boot) is passed on, so the page still pairs it with the
          // ready that follows instead of announcing that bad baseline.
          if (frame.code !== "calibration" || awaitingCalibrationRef.current === 0) {
            onErrorRef.current?.(frame.message, frame.code);
          }

          return;
        }

        if (frame.type === "ready") {
          // The answer to a calibration someone here is awaiting: reported
          // through its outcome, which settles right after this frame.
          if (awaitingCalibrationRef.current > 0) {
            return;
          }

          // Unasked for, so the board rebooted: as the run began, the start
          // is settled on it; mid-run, it is reported as is.
          if (awaitingReadyRef.current) {
            settleStart();

            return;
          }

          onReadyRef.current?.(frame.baselineMm, frame.baselineOk ?? true);

          return;
        }

        if (frame.type === "heartbeat") {
          if (frame.depthMm !== undefined) {
            setLiveDepthMm(frame.depthMm);
          }

          settleStart();

          return;
        }

        setLiveDepthMm(frame.endDepthMm);

        // Live depth still updates before the countdown ends; only recording waits.
        if (!recordingRef.current) {
          return;
        }

        setReadings((previous) => {
          return previous.length >= max
            ? previous
            : [
                ...previous,
                {
                  timestampMs: frame.timestampMs,
                  startDepthMm: frame.startDepthMm,
                  endDepthMm: frame.endDepthMm,
                },
              ];
        });
      },
      { run: true },
    );
    unsubscribeRef.current = unsubscribe;

    // Clear tracking left over from the previous participant or idle hands.
    void sendSerialCommand(SERIAL_COMMANDS.resetSession);

    // Deferred a tick so a mount that is immediately undone (StrictMode) does
    // not announce twice.
    const announceTimer = window.setTimeout(settleStart, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(announceTimer);
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, [connected, max]);

  /**
   * The participant's Recalibrate. Resolves with its own outcome, for the
   * caller to report; one already in flight is joined rather than doubled.
   */
  const recalibrate = useCallback(async () => {
    const request = recalibrateSerialLink();
    participantRequestRef.current = request;
    awaitingCalibrationRef.current += 1;

    try {
      const result = await request;

      // Answered either way: the run's start needs no announcement of its own.
      if (result !== "lost") {
        awaitingReadyRef.current = false;
      }

      return result;
    } finally {
      awaitingCalibrationRef.current -= 1;
    }
  }, []);

  return { liveDepthMm, readings, recalibrate, resetReadings, status, stop } as const;
};
