import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";

import { Logo } from "@/components/logo";

/**
 * Shown while the booth's firmware is being flashed: the updater relaunches the
 * kiosk here, straight from a cold start. The root keeps the serial port closed
 * on this route so the board can be written, and the heartbeat tells the
 * backend to hold its alerts. Nothing here leads anywhere: the updater brings
 * the kiosk back once it is done.
 */
const RouteComponent = () => {
  const { t } = useTranslation();

  return (
    <div className="flex h-dvh w-screen flex-col gap-5 p-20">
      <Logo className="self-center" />

      <div className="flex flex-1 items-center justify-center rounded-3xl bg-secondary">
        <div className="flex w-full max-w-5xl flex-col items-center gap-10 rounded-[3rem] bg-card px-16 py-14 text-center shadow-2xl">
          <div className="flex size-36 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <svg
              className="size-20 motion-safe:animate-[spin_6s_linear_infinite]"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>

          <div className="flex flex-col gap-5">
            <p className="font-heading text-7xl font-bold tracking-tight text-foreground">
              {t("maintenance.title")}
            </p>
            <p className="text-4xl leading-snug text-balance text-muted-foreground">
              {t("maintenance.body")}
            </p>
          </div>

          {/* Progress has no measurable end here, so the dots only show the
            booth is alive, not how long is left. */}
          <div className="flex gap-3" aria-hidden>
            {[0, 1, 2].map((index) => {
              return (
                <span
                  className="size-4 rounded-full bg-foreground motion-safe:animate-pulse"
                  key={index}
                  style={{ animationDelay: `${index * 200}ms` }}
                />
              );
            })}
          </div>

          {/* The board calibrates against the resting chest when the update
            finishes, so anyone at the booth has to keep off it. A tinted
            notice rather than a solid pill: nothing on this screen can be
            tapped, so nothing should look like a button. */}
          <div className="flex w-full items-center justify-center gap-6 rounded-3xl border-2 border-destructive/30 bg-destructive/10 px-10 py-6 text-destructive">
            <svg
              className="size-14 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
              <path d="m2 2 20 20" />
            </svg>
            <p className="text-left text-3xl font-semibold text-balance">
              {t("maintenance.handsOff")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/(public)/maintenance/")({
  component: RouteComponent,
});
