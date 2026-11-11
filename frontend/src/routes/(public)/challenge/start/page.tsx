import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { faker } from "@faker-js/faker";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

import { IdleWarning } from "@/components/idle-warning";
import { Logo } from "@/components/logo";
import { NoSignalBanner } from "@/components/no-signal-banner";
import { Button } from "@/components/ui";
import { CONFIG } from "@/config/constants";
import { env } from "@/config/env";
import { setKioskContext, setSessionContext } from "@/config/sentry";
import { getSerialLinkState, useIdleReset } from "@/hooks";
import { queueCprSession } from "@/services/cpr-sessions";
import {
  CHALLENGE_MODES,
  type CprCompression,
  ensureKioskId,
  setCprSession,
  useMode,
  usePairedLocation,
  useRegistrationId,
  useSerialPort,
  useSessionPublicId,
} from "@/stores";
import { deriveCompressions } from "@/utils";
import { Countdown, DepthBar, SemiCircleGauge, TimerOverlay } from "./-components";
import { useRhythmAudio, useSerialCompressions } from "./-hooks";

/** A participant who stops mid-session hands the kiosk back to the attract screen. */
const ABANDON_TIMEOUT_MS = 40_000;

/** How close behind an error frame a ready frame counts as the same calibration. */
const CALIBRATION_PAIR_WINDOW_MS = 1_000;

const EMPTY_READING = {
  timestampMs: 0,
  startDepthMm: 0,
  endDepthMm: 0,
  bpm: null as number | null,
  hasFullyCompressed: false,
  hasFullyRebounded: false,
};

const RouteComponent = () => {
  // Nothing is recorded until the countdown overlay actually finishes.
  const [hasStarted, setHasStarted] = useState(false);

  const { audioRef, audioSrc, startAudio, stopAudio } = useRhythmAudio();
  const [manualReadings, setManualReadings] = useState<CprCompression[]>([]);
  const hasEnded = useRef(false);

  const { t } = useTranslation();
  const navigate = useNavigate();
  const storedPort = useSerialPort();
  const mode = useMode();

  const isArduinoMode = mode === CHALLENGE_MODES.ARDUINO;
  const sessionPublicId = useSessionPublicId();
  const registrationId = useRegistrationId();
  const locationId = usePairedLocation()?.id ?? null;

  useEffect(() => {
    setKioskContext({ locationId, mode });
    setSessionContext(sessionPublicId);
  }, [locationId, mode, sessionPublicId]);

  // The participant's recalibration in progress, so a second press is ignored.
  const recalibrationToastRef = useRef<number | string | null>(null);

  // Older firmware reports a failed boot calibration as an error frame
  // immediately followed by a ready frame. Remembering when the error landed
  // stops the two being announced as a failure and a success side by side. Only
  // when, not whether: a refused recalibration sends the error alone, and the
  // next calibration must still be reported as itself.
  const calibrationFailedAtRef = useRef(0);

  const handleSerialError = useCallback(
    (message: string, code?: "sensor" | "calibration") => {
      if (code === "calibration") {
        // Nobody asked for this one, so it is the board's own calibration
        // failing. Translated copy rather than the device's own English string,
        // which was never meant for a participant to read.
        calibrationFailedAtRef.current = Date.now();
        toast.error(t("challenge.messages.calibrationFailed"));

        return;
      }

      toast.error(message);
    },
    [t],
  );

  const handleSerialReady = useCallback(
    (baselineMm: number, baselineOk: boolean) => {
      const alreadyReported =
        Date.now() - calibrationFailedAtRef.current < CALIBRATION_PAIR_WINDOW_MS;
      calibrationFailedAtRef.current = 0;

      // Either the ready frame itself says the baseline was rejected, or an
      // error frame just said so. Newer firmware sends one or the other, older
      // firmware sends the error and then claims ready anyway; in every case the
      // failure stands and the sensor must not also be announced as ready.
      if (!baselineOk || alreadyReported) {
        if (!alreadyReported) {
          toast.error(t("challenge.messages.calibrationFailed"));
        }

        return;
      }

      // Fires once as the run starts, from the baseline the board already holds
      // (or the idle calibration it was finishing). The overlay asks for hands
      // off the chest; this is the other half of that exchange.
      toast.success(
        env.VITE_APP_ENV === "local"
          ? t("challenge.messages.sensorReadyDetail", { mm: Math.round(baselineMm) })
          : t("challenge.messages.sensorReady"),
      );
    },
    [t],
  );

  const {
    liveDepthMm,
    readings: serialReadings,
    recalibrate,
    resetReadings,
    status: serialStatus,
    stop: stopSerial,
  } = useSerialCompressions({
    connected: isArduinoMode,
    max: CONFIG.totalCompressions,
    onError: handleSerialError,
    onReady: handleSerialReady,
    recording: hasStarted,
  });

  const rawReadings = isArduinoMode ? serialReadings : manualReadings;

  // Rate, full compression and full recoil are derived here from the raw
  // millimeters the sensor reports — one set of CPR thresholds, one place.
  const readings = useMemo(() => {
    return deriveCompressions(rawReadings);
  }, [rawReadings]);

  useEffect(() => {
    if (isArduinoMode && !storedPort) {
      toast.error(t("challenge.messages.noPortRedirect"));
      navigate({ to: "/setup" });
    }
  }, [isArduinoMode, storedPort, navigate, t]);

  const addManualCompression = useCallback(() => {
    setManualReadings((previous) => {
      if (previous.length >= CONFIG.totalCompressions) {
        return previous;
      }

      return [
        ...previous,
        {
          timestampMs: performance.now(),
          // Plausible millimeters against the shared thresholds: mostly-good
          // recoil, depth straddling the 50-60mm ideal band.
          startDepthMm: faker.number.float({ min: 0, max: 8 }),
          endDepthMm: faker.number.float({ min: 40, max: 65 }),
        },
      ];
    });
  }, []);

  // Manual fallback: spacebar for an operator with a keyboard, and a tap target
  // below for the touchscreen, where there is no keyboard at all.
  useEffect(() => {
    if (isArduinoMode || !hasStarted) {
      return;
    }

    const handleSpacebarPress = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) {
        return;
      }

      event.preventDefault();
      addManualCompression();
    };

    window.addEventListener("keydown", handleSpacebarPress);

    return () => {
      window.removeEventListener("keydown", handleSpacebarPress);
    };
  }, [isArduinoMode, hasStarted, addManualCompression]);

  const handleEndCprChallenge = useCallback(
    (collected: CprCompression[]) => {
      if (hasEnded.current) {
        return;
      }
      hasEnded.current = true;

      stopAudio();

      stopSerial();

      setCprSession({ compressions: collected });

      // Queued rather than awaited: the results screen must never wait on the
      // network. Where this run placed arrives with the save, and is folded into
      // the results if that happens while they are still showing. A manual run
      // is a spacebar demo, not a measured one: it is never saved, so it stays
      // out of the stats and sends no email.
      if (isArduinoMode && sessionPublicId) {
        queueCprSession({
          publicId: sessionPublicId,
          registrationId,
          kioskId: ensureKioskId(),
          buildId: __BUILD_ID__,
          compressions: collected,
        });
      }

      navigate({ to: "/challenge/results" });
    },
    [navigate, stopSerial, stopAudio, isArduinoMode, sessionPublicId, registrationId],
  );

  useEffect(() => {
    if (rawReadings.length >= CONFIG.totalCompressions) {
      handleEndCprChallenge(rawReadings);
    }
  }, [rawReadings, handleEndCprChallenge]);

  const handleRecalibrate = useCallback(async () => {
    if (recalibrationToastRef.current !== null) {
      return;
    }

    const id = toast.loading(t("challenge.messages.recalibrating"));
    recalibrationToastRef.current = id;

    // Always resolves: the link settles every calibration as answered,
    // refused, timed out or lost with the link.
    const result = await recalibrate();
    recalibrationToastRef.current = null;

    // The run ended or was abandoned meanwhile: the page is gone, so neither
    // reset the next participant's session nor toast over their screen.
    if (hasEnded.current) {
      toast.dismiss(id);

      return;
    }

    if (result === "ok") {
      resetReadings();
      setManualReadings([]);

      const baselineMm = getSerialLinkState().baseline?.mm ?? 0;
      toast.success(t("challenge.messages.recalibrated", { mm: Math.round(baselineMm) }), { id });

      return;
    }

    toast.error(
      t(result === "lost" ? "challenge.messages.noSignal" : "challenge.messages.recalibrateFailed"),
      { id },
    );
  }, [recalibrate, resetReadings, t]);

  const handleAbandon = useCallback(() => {
    if (hasEnded.current) {
      return;
    }
    hasEnded.current = true;

    stopSerial();
    setCprSession(null);
    navigate({ to: "/" });
  }, [navigate, stopSerial]);

  const idleSecondsLeft = useIdleReset({
    activityKey: rawReadings.length,
    enabled: hasStarted,
    onIdle: handleAbandon,
    timeoutMs: ABANDON_TIMEOUT_MS,
    warningMs: 15_000,
  });

  const currentReading = useMemo(() => {
    return readings[readings.length - 1] ?? EMPTY_READING;
  }, [readings]);

  // bpm is null until there are at least two compressions to measure between.
  const displayBpm = currentReading.bpm ?? 0;

  // Returns the key, not the translated string: the copy carries <bold> markup
  // that only Trans can render, and Trans needs a key to look up.
  const handleTitleKey = () => {
    if (readings.length < CONFIG.totalCompressions * 0.5) {
      return "challenge.title";
    } else if (readings.length < CONFIG.totalCompressions * 0.75) {
      return "challenge.execution.good_rhythm";
    } else {
      return "challenge.execution.keep_going";
    }
  };

  return (
    <>
      <TimerOverlay
        onTimeUp={() => {
          setHasStarted(true);

          // Started here rather than on mount so the click begins with the
          // compressions, not over the countdown that is asking for hands off
          // the chest. The tap that opened this screen is the gesture that
          // makes playback permissible.
          startAudio();
        }}
      />

      <audio preload="auto" ref={audioRef} src={audioSrc} loop />

      {env.VITE_APP_ENV === "local" && isArduinoMode ? (
        <div className="absolute top-0 left-0 z-50 bg-foreground/80 px-3 py-1 font-mono text-sm text-background">
          {serialStatus} · depth {liveDepthMm.toFixed(1)}mm · n={readings.length}
          {currentReading.bpm === null ? " · bpm —" : ` · bpm ${currentReading.bpm.toFixed(0)}`}
        </div>
      ) : null}

      <IdleWarning secondsLeft={idleSecondsLeft} />

      <NoSignalBanner />

      <div className="relative flex size-full flex-col items-center justify-center gap-30 px-20 py-16">
        <div className="flex w-full flex-col items-center gap-10">
          <Logo />

          <div className="flex flex-col items-center gap-5">
            <h2 className="text-center font-heading text-[clamp(1.75rem,4vh,3rem)] font-bold text-foreground">
              <Trans
                components={{ bold: <span className="text-primary" /> }}
                i18nKey={handleTitleKey()}
              />
            </h2>

            {!isArduinoMode ? (
              <Button
                className="mt-2 min-h-24 w-full text-3xl"
                onClick={addManualCompression}
                size="2xl"
                variant="destructive"
              >
                {t("challenge.manualMode")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex w-full flex-col items-center gap-10">
          <div className="grid w-full grid-cols-3 gap-6 *:flex *:size-full *:flex-col *:items-center *:gap-4 *:rounded-3xl *:p-8">
            <div className="bg-metric-box/70">
              <p className="text-2xl font-medium text-foreground">
                {t("challenge.execution.compressionsLeft")}
              </p>

              <div className="flex grow items-center">
                <Countdown
                  current={CONFIG.totalCompressions - readings.length}
                  total={CONFIG.totalCompressions}
                />
              </div>
            </div>

            <div className="bg-metric-box-secondary/60">
              <p className="text-2xl font-medium text-foreground">
                {t("challenge.execution.depthGauge")}
              </p>
              <div className="flex grow items-center">
                <DepthBar
                  currentReading={currentReading}
                  maxDepthMm={CONFIG.maxDepthMm}
                  sweetSpotMm={CONFIG.sweetSpotMm}
                />
              </div>
            </div>

            <div className="relative bg-metric-box-tertiary/50">
              <p className="text-2xl font-medium text-foreground">
                {t("challenge.execution.rhythmGauge")}
              </p>

              <SemiCircleGauge value={displayBpm} />

              <p
                className={twMerge(
                  "absolute bottom-12 transform text-center text-2xl font-bold",
                  displayBpm > CONFIG.slowBpmThreshold && displayBpm < CONFIG.fastBpmThreshold
                    ? "text-results-high"
                    : "text-results-mid",
                )}
              >
                {displayBpm > 0 && displayBpm < CONFIG.slowBpmThreshold
                  ? t("challenge.feedback.tooSlow")
                  : null}
                {displayBpm > CONFIG.fastBpmThreshold && t("challenge.feedback.tooFast")}

                {displayBpm > CONFIG.slowBpmThreshold &&
                  displayBpm < CONFIG.fastBpmThreshold &&
                  t("challenge.feedback.goodRhythm")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-10">
            <Button onClick={handleAbandon} variant="link">
              {t("common.back")}
            </Button>

            <Button onClick={handleRecalibrate} variant="outline">
              {t("challenge.execution.recalibrate")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export const Route = createFileRoute("/(public)/challenge/start/")({
  component: RouteComponent,
});
