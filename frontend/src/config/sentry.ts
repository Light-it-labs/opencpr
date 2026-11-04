import * as Sentry from "@sentry/react";

import { env } from "@/config/env";
import { router } from "./router";

export const isSentryEnabled = Boolean(env.VITE_SENTRY_DSN);

/**
 * Errors the kiosk is designed to tolerate. Session upload and claim polling are
 * deliberately allowed to fail — the booth keeps working offline — so reporting
 * them would bury real faults under venue-wifi noise.
 */
const isExpectedNetworkNoise = (event: Sentry.ErrorEvent) => {
  const value = event.exception?.values?.[0];

  return (
    value?.type === "AxiosError" ||
    value?.value?.includes("Network Error") ||
    value?.value?.includes("Failed to fetch")
  );
};

export const initializeSentry = () => {
  if (!isSentryEnabled) {
    return;
  }

  Sentry.init({
    dsn: env.VITE_SENTRY_DSN,
    environment: env.VITE_APP_ENV,
    enableLogs: true,
    integrations: [
      Sentry.tanstackRouterBrowserTracingIntegration(router),
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // The registration form runs on the participant's own phone and collects
        // a name and an email. Anything tagged data-sentry-mask is redacted in
        // replays; inputs are masked everywhere as a second line of defense.
        mask: ["[data-sentry-mask]"],
        maskAllInputs: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: [new RegExp(env.VITE_SENTRY_TRACE_PROPAGATION_TARGET_REGEX)],
    // A kiosk runs few but long sessions, and the interesting ones are the ones
    // that broke, so sample errors fully and ordinary sessions sparsely.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend: (event) => {
      return isExpectedNetworkNoise(event) ? null : event;
    },
  });
};

/**
 * Which machine, which venue, which mode. Without this every booth error looks
 * identical and there is no way to tell one kiosk's faults from another's.
 */
export const setKioskContext = (context: { locationId: string | null; mode: string | null }) => {
  if (!isSentryEnabled) {
    return;
  }

  Sentry.setTag("kiosk.mode", context.mode ?? "unset");
  Sentry.setTag("kiosk.location", context.locationId ?? "unset");
};

/** The run a report belongs to, so a fault can be traced to a stored session. */
export const setSessionContext = (publicId: string | null) => {
  if (!isSentryEnabled) {
    return;
  }

  Sentry.setTag("kiosk.session", publicId ?? "none");
};

/**
 * Serial lifecycle as breadcrumbs. The most common booth failure is the sensor
 * link dropping, and without this an error arrives with no trace of what the
 * hardware was doing beforehand.
 */
export const addSerialBreadcrumb = (message: string, data?: Record<string, unknown>) => {
  if (!isSentryEnabled) {
    return;
  }

  Sentry.addBreadcrumb({ category: "serial", level: "info", message, data });
};

export const getSentryErrorHandlers = () => {
  if (!isSentryEnabled) {
    return {};
  }

  return {
    onUncaughtError: Sentry.reactErrorHandler((error, errorInfo) => {
      // eslint-disable-next-line no-console
      console.warn("Uncaught error", error, errorInfo.componentStack);
    }),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
  };
};
