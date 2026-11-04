import { useTranslation } from "react-i18next";

import { CHALLENGE_MODES, type SerialStatus, useMode, useSerialStatus } from "@/stores";

/**
 * The link states that mean the sensor has gone quiet or broken. "idle" and
 * "opening" are left out: they are the launch and run-change transitions, not
 * a fault anyone needs to act on.
 */
const LOST_STATUSES: readonly SerialStatus[] = [
  "no-signal",
  "sensor-fault",
  "disconnected",
  "error",
];

/**
 * Raised over any screen while the Arduino link is down, so staff and the next
 * participant learn about it before a run rather than halfway through one.
 */
export const NoSignalBanner = () => {
  const { t } = useTranslation();
  const mode = useMode();
  const status = useSerialStatus();

  if (mode !== CHALLENGE_MODES.ARDUINO || !LOST_STATUSES.includes(status)) {
    return null;
  }

  return (
    <div className="absolute inset-x-0 top-0 z-50 bg-destructive px-8 py-4 text-center text-2xl font-bold text-destructive-foreground">
      {t("challenge.messages.noSignal")}
    </div>
  );
};
