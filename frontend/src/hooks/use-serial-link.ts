import { useEffect, useRef } from "react";

import { addSerialBreadcrumb } from "@/config/sentry";
import {
  adoptDeviceKioskId,
  getSerialStatus,
  recordSerialHealth,
  type SerialStatus,
  setSerialPort,
  setSerialStatus,
  useSerialPort,
} from "@/stores";
import {
  getAuthorizedPort,
  isSerialSupported,
  SERIAL_BAUD_RATE,
  SERIAL_COMMANDS,
  type SerialFrame,
  serialFrameSchema,
} from "@/utils";

/**
 * Stall watchdog. The device heartbeats every 500ms, so this is twelve missed
 * beats — yet it has to stay above the ~3s the board spends sampling its
 * baseline after every boot and recalibration, during which it does not
 * heartbeat. Tighter would raise a false "no signal" on every calibration.
 *
 * Counted from the last frame, or from the moment the port was opened, so a
 * board that never answers after a reopen is caught too.
 */
const SIGNAL_TIMEOUT_MS = 6_000;
const SIGNAL_CHECK_INTERVAL_MS = 500;

/**
 * Reconnect backoff once the link is lost: 1s, 2s, 4s, then every 5s until the
 * device is back or the hook is stopped. A `connect` event skips the wait.
 */
const RECONNECT_INITIAL_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 5_000;

/**
 * Idle recalibration. A run no longer reboots the board, so its baseline is
 * retaken while nobody is using it: once the chest has been still for
 * IDLE_QUIET_MS after a run, and every IDLE_RECALIBRATE_MS while the booth
 * stays empty.
 *
 * A bad baseline (the board booting with the chest open), a refused attempt
 * (someone leaning on the chest) or one the board never answers is retried
 * sooner, on a backoff: 15s, 30s, 60s, then every 2 min until one succeeds.
 * Those retries only need IDLE_RETRY_QUIET_MS of stillness, so the booth is
 * fixed before the next participant rather than by them.
 */
const IDLE_QUIET_MS = 30_000;
const IDLE_RECALIBRATE_MS = 30 * 60_000;
const IDLE_RETRY_INITIAL_DELAY_MS = 15_000;
const IDLE_RETRY_MAX_DELAY_MS = 2 * 60_000;
const IDLE_RETRY_QUIET_MS = 15_000;

/**
 * Firmware that refuses every calibration keeps the backoff at its 2 min cap
 * for good. The same idle result is logged again at most this often, so such
 * a board leaves one breadcrumb per change rather than one per attempt.
 */
const IDLE_REPEAT_LOG_INTERVAL_MS = 10 * 60_000;

/** The board answers a calibration within ~3s; past this it is not coming. */
const CALIBRATION_TIMEOUT_MS = 8_000;

/**
 * How one calibration request ended: a good baseline, refused (the board kept
 * its previous one, or booted on a bad one), never answered, or lost with the
 * link (or never written because the link was already gone).
 */
export type CalibrationResult = "ok" | "refused" | "unanswered" | "lost";

type PendingCalibration = {
  since: number;
  /** Whether it is the owner's own, rather than a screen's. */
  idle: boolean;
  result: Promise<CalibrationResult>;
  resolve: (result: CalibrationResult) => void;
};

/** Why the read loop ended when it was not asked to stop. */
type LinkLoss = {
  reason: Extract<SerialStatus, "no-signal" | "disconnected" | "error">;
  detail?: string;
};

export type SerialLinkEvent =
  | { kind: "frame"; frame: SerialFrame }
  | { kind: "lost"; reason: LinkLoss["reason"]; detail?: string };

type SerialLinkListener = (event: SerialLinkEvent) => void;

/*
 * There is one sensor and one owner of it, so the parts of the link that
 * screens need to reach — to listen, to send a command, to recalibrate —
 * live at module level rather than in the owner's refs.
 */
const listeners = new Set<SerialLinkListener>();
/** The subset belonging to a run. While any is subscribed, the chest is in use. */
const runListeners = new Set<SerialLinkListener>();
const link = {
  /**
   * The port being read right now. Starts as the stored one and is swapped
   * when the device re-enumerates: the browser then hands out a new SerialPort
   * for the same hardware and the old object is dead for good.
   */
  port: null as SerialPort | null,
  /** Cuts a reconnect wait short: on a `connect` event, or on stop. */
  wake: null as (() => void) | null,
  /** The running supervisor, so a new owner waits for the old one to let go. */
  loop: null as Promise<void> | null,
  /** The baseline the board last announced since this page loaded. */
  baseline: null as { mm: number; ok: boolean } | null,
  lastCompressionAt: 0,
  calibration: {
    /** The calibration in flight, if any. Only ever one: later requests join it. */
    pending: null as PendingCalibration | null,
    lastOkAt: 0,
    /** No idle attempt before this, after a failed one or a bad boot. */
    retryAt: 0,
    /** Failed idle attempts and bad boots since the last good baseline. */
    failures: 0,
    /** A run has left the chest since the last good baseline. */
    runEnded: false,
    /** The idle result last logged, and when; see IDLE_REPEAT_LOG_INTERVAL_MS. */
    loggedResult: null as CalibrationResult | null,
    loggedAt: 0,
  },
};

const emit = (event: SerialLinkEvent) => {
  listeners.forEach((listener) => {
    listener(event);
  });
};

/**
 * Frames and losses as the owner sees them. Returns the unsubscribe. A `run`
 * subscriber marks the chest as in use, which holds off idle recalibration
 * until it leaves.
 */
export const subscribeToSerialLink = (
  listener: SerialLinkListener,
  { run = false }: { run?: boolean } = {},
) => {
  listeners.add(listener);
  if (run) {
    runListeners.add(listener);
  }

  return () => {
    listeners.delete(listener);
    if (runListeners.delete(listener)) {
      link.calibration.runEnded = true;
    }
  };
};

/** What a run needs to know about the link as it starts. */
export const getSerialLinkState = () => {
  return {
    reading: getSerialStatus() === "reading",
    baseline: link.baseline,
    calibrating: link.calibration.pending !== null,
  };
};

/**
 * Writes are chained: the stream allows one writer at a time, and commands are
 * sent back to back (a run opens with 'R' and may follow with 'C' at once).
 * Never rejects, so the chain cannot break.
 */
let writeQueue: Promise<boolean> = Promise.resolve(true);

/**
 * Single-character command to the device. Resolves with whether it was
 * written; callers that do not care need not wait.
 */
export const sendSerialCommand = (command: string) => {
  const write = async () => {
    const writable = link.port?.writable;

    if (!writable) {
      return false;
    }

    let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

    try {
      writer = writable.getWriter();
      await writer.write(new TextEncoder().encode(command));

      return true;
    } catch {
      // The link is gone; status already reflects it.
      return false;
    } finally {
      writer?.releaseLock();
    }
  };

  writeQueue = writeQueue.then(write);

  return writeQueue;
};

const wake = () => {
  link.wake?.();
  link.wake = null;
};

/**
 * Sends 'C', or joins the calibration already in flight without sending
 * anything: the board answers each 'C' with one frame that says nothing about
 * which request it answers, so two in flight could not be told apart. A
 * joined request shares the pending one's outcome, and stays idle or not as
 * the first request was.
 */
const requestCalibration = (idle: boolean) => {
  const { calibration } = link;

  if (calibration.pending) {
    return calibration.pending.result;
  }

  let resolve: (result: CalibrationResult) => void = () => {};
  const result = new Promise<CalibrationResult>((settle) => {
    resolve = settle;
  });
  const pending: PendingCalibration = { since: Date.now(), idle, result, resolve };
  calibration.pending = pending;

  void sendSerialCommand(SERIAL_COMMANDS.recalibrate).then((sent) => {
    // Never written: the link is gone, and nothing will answer.
    if (!sent && calibration.pending === pending) {
      settleCalibration("lost");
    }
  });

  return result;
};

/**
 * Asks the board to retake its resting baseline. It goes silent for ~3s, then
 * answers with a `ready` frame, or with an `error` frame coded "calibration"
 * when it refuses and keeps the previous baseline. Resolves with this
 * request's own outcome, always: the answer, a timeout, or the link's loss.
 */
export const recalibrateSerialLink = () => {
  return requestCalibration(false);
};

const markBaselineGood = (now: number) => {
  const { calibration } = link;
  calibration.lastOkAt = now;
  calibration.runEnded = false;
  calibration.failures = 0;
  // A stale backoff deadline would otherwise hold back the next post-run
  // recalibration past its 30s of quiet.
  calibration.retryAt = 0;
};

/** Paces idle retries: 15s, 30s, 60s, then every 2 min. */
const backOffIdleRetry = (now: number) => {
  const { calibration } = link;
  calibration.retryAt =
    now +
    Math.min(IDLE_RETRY_INITIAL_DELAY_MS * 2 ** calibration.failures, IDLE_RETRY_MAX_DELAY_MS);
  calibration.failures += 1;
};

const logIdleResult = (result: CalibrationResult, now: number) => {
  const { calibration } = link;
  const repeat = result !== "ok" && result === calibration.loggedResult;

  if (repeat && now - calibration.loggedAt < IDLE_REPEAT_LOG_INTERVAL_MS) {
    return;
  }

  addSerialBreadcrumb(`idle recalibration ${repeat ? "still " : ""}${result}`, {
    baselineMm: link.baseline?.mm,
    failures: calibration.failures,
  });
  calibration.loggedResult = result;
  calibration.loggedAt = now;
};

/**
 * Closes out the pending calibration and hands its outcome to whoever asked.
 * Only the owner's own attempts feed the idle backoff: a participant's or a
 * run's refusal says someone is at the chest, not that the booth needs fixing.
 */
const settleCalibration = (result: CalibrationResult) => {
  const { calibration } = link;
  const { pending } = calibration;

  if (!pending) {
    return;
  }

  calibration.pending = null;
  const now = Date.now();

  if (result === "ok") {
    markBaselineGood(now);
  } else if (pending.idle && result !== "lost") {
    backOffIdleRetry(now);
  }

  if (pending.idle) {
    logIdleResult(result, now);
  } else if (result === "unanswered") {
    addSerialBreadcrumb("recalibration unanswered");
  }

  pending.resolve(result);
};

/**
 * Recalibrates while nobody is watching: never during a run, never while the
 * chest is moving, and only when the baseline is bad, the last attempt failed,
 * a run has ended since the last good baseline, or that baseline is getting
 * old.
 */
const recalibrateIfIdle = (now: number) => {
  const { calibration } = link;
  // A baseline the board flagged as bad (it booted with the chest open) is
  // retried like a failed attempt, whoever's request last left it so.
  const retrying = link.baseline?.ok === false || calibration.failures > 0;

  if (
    getSerialStatus() !== "reading" ||
    runListeners.size > 0 ||
    calibration.pending !== null ||
    now < calibration.retryAt ||
    now - link.lastCompressionAt < (retrying ? IDLE_RETRY_QUIET_MS : IDLE_QUIET_MS)
  ) {
    return;
  }

  if (retrying || calibration.runEnded || now - calibration.lastOkAt >= IDLE_RECALIBRATE_MS) {
    void requestCalibration(true);
  }
};

const parseFrame = (line: string): unknown => {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
};

/** One line per link state change — never one per retry. */
const logLinkChange = (message: string, data: Record<string, unknown>) => {
  addSerialBreadcrumb(message, data);
  // eslint-disable-next-line no-console -- The booth is unattended; the console is the only local trace.
  console.info(`[serial] ${message}`, data);
};

const portInfo = (port: SerialPort): SerialPortInfo | undefined => {
  try {
    return port.getInfo();
  } catch {
    return undefined;
  }
};

const closeQuietly = async (port: SerialPort) => {
  try {
    if (port.readable || port.writable) {
      await port.close();
    }
  } catch {
    // Already closed, or closing from the other side.
  }
};

/**
 * The single owner of the sensor's serial port, mounted once at the root so
 * the link is read from boot on every screen. Sensor health is therefore
 * always current, rather than only during a run.
 *
 * Keeps no React state: frames arrive twice a second and the root must not
 * re-render on each. Status goes to the store, frames to subscribers.
 */
export const useSerialLink = ({ enabled }: { enabled: boolean }) => {
  const storedPort = useSerialPort();

  // Read through a ref so a port swapped mid-run (see link.port) does not
  // restart the effect and tear down the link it just recovered.
  const portRef = useRef(storedPort);
  portRef.current = storedPort;

  const hasPort = storedPort !== null;

  // The booth boots to /setup and the port is only stored once staff confirm
  // it, so health would go unreported until then. A port granted on an earlier
  // launch comes back from getPorts() without any prompt; take it now, and
  // again when the board is plugged in after launch. Without a grant this finds
  // nothing and setup asks for the port as before.
  useEffect(() => {
    if (!enabled || hasPort || !isSerialSupported()) {
      return;
    }

    let cancelled = false;

    const adoptGrantedPort = async () => {
      const port = await getAuthorizedPort();

      if (!cancelled && port) {
        addSerialBreadcrumb("granted port adopted at launch");
        setSerialPort(port);
      }
    };

    const handleConnect = () => {
      void adoptGrantedPort();
    };

    void adoptGrantedPort();
    navigator.serial.addEventListener("connect", handleConnect);

    return () => {
      cancelled = true;
      navigator.serial.removeEventListener("connect", handleConnect);
    };
  }, [enabled, hasPort]);

  useEffect(() => {
    if (!enabled || !hasPort) {
      return;
    }

    // Per run of this effect, so a supervisor still winding down from the
    // previous run can never be revived by this one.
    let stopped = false;
    // Also per run, so this run never acts on the previous loop's reader.
    let lastFrameAt = 0;
    /** Set by whoever noticed the link go, read by the loop once it has ended. */
    let loss: LinkLoss | null = null;
    let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    // Non-null while the link is down. Carries the backoff across retries so a
    // port that is present but refuses to open still settles at the cap.
    let outage: { lostAt: number; attempts: number; delayMs: number } | null = null;

    const handleFrame = (line: string) => {
      const parsed = serialFrameSchema.safeParse(parseFrame(line));

      // Anything unrecognized — a partial line after a reset, a future frame
      // type — is dropped rather than scored.
      if (!parsed.success) {
        return;
      }

      const frame = parsed.data;
      lastFrameAt = Date.now();

      if (outage) {
        logLinkChange("serial link restored", {
          downtimeMs: Date.now() - outage.lostAt,
          attempts: outage.attempts,
        });
        outage = null;
      }

      if (frame.type === "error") {
        // An idle refusal is logged by settleCalibration, which throttles a
        // board that refuses forever; logging it here too would undo that.
        if (frame.code !== "calibration" || !link.calibration.pending?.idle) {
          addSerialBreadcrumb("device error", { code: frame.code, message: frame.message });
        }
        // A refused baseline is not a sensor fault — ranging still works and the
        // previous baseline stands, so it is neither reported as one nor allowed
        // to raise the no-signal banner.
        if (frame.code === "calibration") {
          settleCalibration("refused");
        } else {
          recordSerialHealth({ status: "sensor-fault" });
          setSerialStatus("sensor-fault");
        }
      } else if (frame.type === "ready") {
        addSerialBreadcrumb("device ready", { baselineMm: frame.baselineMm });
        // Boot and recalibration alike: either way the board has a new baseline.
        link.baseline = { mm: frame.baselineMm, ok: frame.baselineOk ?? true };

        if (link.calibration.pending) {
          settleCalibration(link.baseline.ok ? "ok" : "refused");
        } else if (link.baseline.ok) {
          markBaselineGood(Date.now());
        } else {
          // A boot on a bad baseline: retried on the idle backoff, like a
          // failed idle attempt.
          backOffIdleRetry(Date.now());
        }
        recordSerialHealth({ status: "reading", baselineMm: frame.baselineMm });
        if (frame.deviceId) {
          adoptDeviceKioskId(frame.deviceId);
        }
        setSerialStatus("reading");
      } else if (frame.type === "heartbeat") {
        recordSerialHealth({ status: frame.sensorOk ? "reading" : "sensor-fault" });
        setSerialStatus(frame.sensorOk ? "reading" : "sensor-fault");
      } else {
        link.lastCompressionAt = Date.now();
        setSerialStatus("reading");
      }

      emit({ kind: "frame", frame });
    };

    /** Sleeps, unless `wake` is called first. */
    const wait = (ms: number) => {
      return new Promise<void>((resolve) => {
        const timer = window.setTimeout(() => {
          link.wake = null;
          resolve();
        }, ms);

        link.wake = () => {
          window.clearTimeout(timer);
          resolve();
        };
      });
    };

    /**
     * Opens the active port and reads it until the link fails or the owner
     * stops. The port is closed either way. Resolves
     * with why the link was lost, or null when stopped.
     *
     * Status is left alone while recovering from an outage: the banner stays up
     * until the board actually speaks, so a reopen the device never answers
     * does not flash "connected" for six seconds first.
     */
    const readUntilLost = async (): Promise<LinkLoss | null> => {
      const activePort = link.port;

      if (!activePort) {
        return { reason: "error", detail: "No serial port" };
      }

      loss = null;

      if (!outage) {
        setSerialStatus("opening");
      }

      let reader: ReadableStreamDefaultReader<Uint8Array>;

      try {
        if (!activePort.readable) {
          await activePort.open({ baudRate: SERIAL_BAUD_RATE });
        }

        if (!activePort.readable) {
          throw new Error("Port opened without a readable stream");
        }

        reader = activePort.readable.getReader();
      } catch (error) {
        addSerialBreadcrumb("port open failed", { error: String(error) });
        await closeQuietly(activePort);

        return stopped ? null : { reason: "error", detail: String(error) };
      }

      activeReader = reader;
      lastFrameAt = Date.now();

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      // Clear any tracking left over from the previous participant, or from
      // before the board went away.
      void sendSerialCommand(SERIAL_COMMANDS.resetSession);

      try {
        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          let newlineIndex = buffer.indexOf("\n");
          while (newlineIndex !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);

            if (line) {
              handleFrame(line);
            }

            newlineIndex = buffer.indexOf("\n");
          }
        }
      } catch (error) {
        // A `disconnect` event may already have named the cause.
        loss ??= { reason: "error", detail: String(error) };
      } finally {
        try {
          reader.releaseLock();
        } catch {
          // Already released.
        }
        activeReader = null;

        await closeQuietly(activePort);
      }

      if (stopped) {
        return null;
      }

      // A clean `done` nobody asked for means the far end closed the stream.
      return loss ?? { reason: "error", detail: "Stream closed by the device" };
    };

    /**
     * Reads until the link drops, then waits for a previously authorized port
     * to come back — on a backoff, or sooner if the browser announces it — and
     * reads again. Runs until the owner stops. No prompt is ever shown: a port
     * the operator has not granted is not ours to take.
     */
    const supervise = async () => {
      while (!stopped) {
        const lost = await readUntilLost();

        if (stopped) {
          return;
        }

        if (!lost) {
          return;
        }

        if (!outage) {
          outage = { lostAt: Date.now(), attempts: 0, delayMs: RECONNECT_INITIAL_DELAY_MS };
          logLinkChange("serial link lost", { reason: lost.reason, detail: lost.detail });
          recordSerialHealth({ status: lost.reason });
          setSerialStatus(lost.reason);
          // Whatever was asked of the board is lost with it; reopening reboots
          // it, and the boot's own ready frame reports the baseline instead.
          // That boot starts the idle backoff over, so a bad one is retried
          // after 15s rather than wherever the old board's attempts had left it.
          settleCalibration("lost");
          link.calibration.failures = 0;
          link.calibration.retryAt = 0;
          link.calibration.loggedResult = null;
          emit({ kind: "lost", reason: lost.reason, detail: lost.detail });
        }

        let replacement: SerialPort | null = null;

        while (!stopped && !replacement) {
          await wait(outage.delayMs);

          if (stopped) {
            return;
          }

          outage.attempts += 1;
          outage.delayMs = Math.min(outage.delayMs * 2, RECONNECT_MAX_DELAY_MS);

          const lostPort = link.port;
          replacement = await getAuthorizedPort(lostPort ? portInfo(lostPort) : undefined);
        }

        if (replacement && replacement !== link.port) {
          link.port = replacement;
          // So the next session opens the live object, not the one that died.
          setSerialPort(replacement);
        }
      }
    };

    const previousLoop = link.loop;
    const loop = (async () => {
      // A previous owner may still be closing the same port.
      await previousLoop?.catch(() => {
        // It reported its own failures through status.
      });

      if (stopped) {
        return;
      }

      link.port = portRef.current;
      await supervise();
    })();
    link.loop = loop;

    const dropLink = (cause: LinkLoss) => {
      if (stopped || !activeReader) {
        return;
      }

      loss ??= cause;
      // Ends the read loop, whose teardown then hands control to the supervisor.
      activeReader.cancel().catch(() => {
        // Already cancelled or closed.
      });
    };

    // One device on this kiosk, so any disconnect is ours.
    const handleDisconnect = () => {
      addSerialBreadcrumb("device disconnected");
      dropLink({ reason: "disconnected" });
    };

    // The board is back: do not sit out the rest of the backoff.
    const handleConnect = () => {
      addSerialBreadcrumb("device connected");
      wake();
    };

    navigator.serial.addEventListener("disconnect", handleDisconnect);
    navigator.serial.addEventListener("connect", handleConnect);

    // Also paces idle recalibration: no need for a second timer.
    const signalCheck = window.setInterval(() => {
      const now = Date.now();

      if (now - lastFrameAt > SIGNAL_TIMEOUT_MS) {
        dropLink({ reason: "no-signal" });

        return;
      }

      const { pending } = link.calibration;
      if (pending && now - pending.since > CALIBRATION_TIMEOUT_MS) {
        settleCalibration("unanswered");
      }

      recalibrateIfIdle(now);
    }, SIGNAL_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(signalCheck);
      navigator.serial.removeEventListener("disconnect", handleDisconnect);
      navigator.serial.removeEventListener("connect", handleConnect);

      stopped = true;
      wake();
      // Nobody will read the answer, and whoever asked must not wait forever.
      settleCalibration("lost");
      // Cancel rather than releaseLock: this resolves the pending read instead
      // of rejecting it, and lets the loop run its own teardown exactly once.
      activeReader?.cancel().catch(() => {
        // Already cancelled or closed.
      });
      void loop
        .catch(() => {
          // The loop reports its own failures through status.
        })
        .then(() => {
          if (link.loop === loop) {
            link.loop = null;
            setSerialStatus("idle");
            // So heartbeats stop reporting the last read of a link nobody owns.
            recordSerialHealth({ status: "idle" });
          }
        });
    };
  }, [enabled, hasPort]);
};
