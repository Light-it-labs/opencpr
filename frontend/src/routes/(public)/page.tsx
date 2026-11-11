import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";

import { Logo } from "@/components/logo";
import { NoSignalBanner } from "@/components/no-signal-banner";
import { AutoFocusButton } from "@/components/ui";
import {
  CHALLENGE_MODES,
  clearRegistration,
  setSerialPort,
  useKioskToken,
  useMode,
  useSerialPort,
} from "@/stores";
import { getAuthorizedPort } from "@/utils";

const RouteComponent = () => {
  const serialPort = useSerialPort();
  const mode = useMode();
  const kioskToken = useKioskToken();
  const { t } = useTranslation();

  // A port authorized on a previous launch comes back without a prompt, so the
  // kiosk recovers from a restart on its own instead of stranding an operator
  // on the setup screen.
  const [hasCheckedPort, setHasCheckedPort] = useState(false);

  useEffect(() => {
    if (serialPort || mode !== CHALLENGE_MODES.ARDUINO) {
      setHasCheckedPort(true);

      return;
    }

    let cancelled = false;

    void getAuthorizedPort().then((port) => {
      if (cancelled) {
        return;
      }
      if (port) {
        setSerialPort(port);
      }
      setHasCheckedPort(true);
    });

    return () => {
      cancelled = true;
    };
  }, [serialPort, mode]);

  useEffect(() => {
    clearRegistration();
  }, []);

  if (!kioskToken || (!serialPort && mode === CHALLENGE_MODES.ARDUINO && hasCheckedPort)) {
    return <Navigate to="/setup" />;
  }

  return (
    <div className="relative flex h-screen flex-col items-center justify-center gap-16 bg-background p-20 text-foreground">
      {/* Start stays tappable: the warning only has to be seen before a run,
          and the run screen keeps showing it while the link is down. */}
      <NoSignalBanner />

      <div className="flex flex-col items-center gap-12 text-center">
        <Logo size="2xl" />

        <div className="flex flex-col gap-2">
          <p className="font-heading text-4xl font-semibold">
            <Trans
              components={{ bold: <strong className="font-bold text-primary" /> }}
              i18nKey="home.title"
            />
          </p>
          <p className="font-heading text-9xl font-bold text-primary">
            {t("home.timeChallenge")}
            <span className="font-medium text-foreground">?</span>
          </p>
        </div>

        <AutoFocusButton size="3xl" asChild autoFocus>
          <Link to="/register">{t("home.startChallenge")}</Link>
        </AutoFocusButton>
      </div>

      <p className="absolute bottom-10 text-lg text-muted-foreground">{t("home.madeBy")}</p>
    </div>
  );
};

export const Route = createFileRoute("/(public)/")({
  component: RouteComponent,
});
