import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui";

const RECOVERY_DELAY_MS = 3_000;

/**
 * Shown instead of a blank page when a screen throws, so an unattended booth
 * does not sit on an error until someone walks up to it. The error itself
 * already reaches Sentry through the root's React error handlers.
 *
 * The same app also serves the registration page on participants' phones,
 * which must never be sent to the kiosk's start screen, and the maintenance
 * screen, which must stay where it is so the board can be flashed.
 */
export const CrashScreen = () => {
  const { t } = useTranslation();
  const { pathname } = window.location;
  const isPhone = /^\/+r\//.test(pathname);
  const isMaintenance = /^\/+maintenance\/?$/.test(pathname);

  useEffect(() => {
    if (isPhone) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (isMaintenance) {
        window.location.reload();
      } else {
        window.location.assign("/");
      }
    }, RECOVERY_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isMaintenance, isPhone]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 bg-background p-6 text-center">
      <Logo />

      <div className="flex max-w-3xl flex-col gap-4">
        <h1 className="font-heading text-3xl font-bold text-foreground sm:text-6xl">
          {t("crash.title")}
        </h1>
        <p className="text-lg text-muted-foreground sm:text-3xl">
          {isPhone ? t("crash.phoneBody") : t("crash.kioskBody")}
        </p>
      </div>

      {isPhone ? (
        <Button
          onClick={() => {
            window.location.reload();
          }}
          size="2xl"
        >
          {t("crash.retry")}
        </Button>
      ) : null}
    </main>
  );
};
