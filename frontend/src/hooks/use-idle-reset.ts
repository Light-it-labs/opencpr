import { useEffect, useRef, useState } from "react";

type UseIdleResetParams = {
  enabled?: boolean;
  /** Called once the kiosk has been untouched for `timeoutMs`. */
  onIdle: () => void;
  timeoutMs: number;
  /**
   * Start warning this long before the reset. The countdown is the informative
   * part: it reaches whoever is actually still standing there, and any activity
   * cancels it. Zero disables the warning.
   */
  warningMs?: number;
  /**
   * Changes whenever something happened that isn't a DOM event — a compression
   * arriving over serial, for instance. Any change restarts the countdown.
   */
  activityKey?: number | string;
};

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart"] as const;
const TICK_MS = 250;

/**
 * Returns an unattended kiosk to its attract screen. Without this a participant
 * who walks away mid-session leaves the machine waiting forever, and the next
 * person arrives at a stranger's half-finished run.
 *
 * @returns whole seconds remaining once inside the warning window, else null.
 */
export const useIdleReset = ({
  activityKey,
  enabled = true,
  onIdle,
  timeoutMs,
  warningMs = 0,
}: UseIdleResetParams) => {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  const deadlineRef = useRef(0);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setSecondsLeft(null);

      return;
    }

    firedRef.current = false;

    const restart = () => {
      deadlineRef.current = Date.now() + timeoutMs;
      setSecondsLeft(null);
    };

    restart();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, restart, { passive: true });
    });

    const tick = window.setInterval(() => {
      const remaining = deadlineRef.current - Date.now();

      if (remaining <= 0) {
        if (!firedRef.current) {
          firedRef.current = true;
          setSecondsLeft(null);
          onIdleRef.current();
        }

        return;
      }

      setSecondsLeft(warningMs > 0 && remaining <= warningMs ? Math.ceil(remaining / 1000) : null);
    }, TICK_MS);

    return () => {
      window.clearInterval(tick);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, restart);
      });
    };
  }, [enabled, timeoutMs, warningMs, activityKey]);

  return secondsLeft;
};
