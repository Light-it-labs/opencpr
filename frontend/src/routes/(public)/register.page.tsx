import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";

import { IdleWarning } from "@/components/idle-warning";
import { Logo } from "@/components/logo";
import { AutoFocusButton, Button } from "@/components/ui";
import { env } from "@/config/env";
import { useIdleReset } from "@/hooks";
import { useCprSessionClaim } from "@/services/cpr-sessions";
import { startNewRegistration } from "@/stores";

/**
 * The opt-out stays hidden at first so registering reads as the normal path.
 * It appears if nothing has happened, so nobody without a phone is ever stuck.
 */
const SKIP_REVEAL_MS = 20_000;

const RouteComponent = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Minted after mount rather than during render, since it writes to the store.
  // Minting unconditionally is safe because this screen is only reachable from
  // the attract screen: there is no way back to it once the run has started.
  // Done here rather than at the end of the run so the QR is on screen while the
  // participant still has time to scan it — and they can fill the form on their
  // phone during the instructions video that follows.
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCanSkip(true);
    }, SKIP_REVEAL_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    setRegistrationId(startNewRegistration());
  }, []);

  // Advances by itself the moment they submit on their phone.
  const { data: claim } = useCprSessionClaim(registrationId);

  useEffect(() => {
    if (claim?.claimed) {
      navigate({ to: "/challenge/instructions" });
    }
  }, [claim, navigate]);

  const idleSecondsLeft = useIdleReset({
    onIdle: () => {
      navigate({ to: "/" });
    },
    timeoutMs: 90_000,
    warningMs: 25_000,
  });

  return (
    <div className="relative flex size-full flex-col items-center justify-center gap-8 px-20 py-12">
      <IdleWarning secondsLeft={idleSecondsLeft} />

      <Logo />

      <div className="flex flex-col items-center gap-2">
        <h1 className="text-center font-heading text-[clamp(1.75rem,4vh,3.25rem)] font-bold text-foreground">
          {t("register.title")}
        </h1>
      </div>

      <div className="rounded-3xl border-4 border-primary bg-card p-6">
        {registrationId ? (
          <QRCodeSVG
            level="M"
            marginSize={0}
            size={340}
            value={`${env.VITE_PUBLIC_URL}/r/${registrationId}`}
          />
        ) : (
          <div className="size-[340px]" />
        )}
      </div>

      <p className="max-w-2xl text-center text-xl text-muted-foreground">{t("register.qrHint")}</p>

      <div className="flex min-h-20 items-center gap-6">
        <Button
          onClick={() => {
            return navigate({ to: "/" });
          }}
          size="xl"
          variant="link"
        >
          {t("common.back")}
        </Button>

        {canSkip ? (
          <AutoFocusButton
            onClick={() => {
              return navigate({ to: "/challenge/instructions" });
            }}
            size="2xl"
            variant="link"
          >
            {t("register.continue")}
          </AutoFocusButton>
        ) : null}
      </div>
    </div>
  );
};

export const Route = createFileRoute("/(public)/register/")({
  component: RouteComponent,
});
