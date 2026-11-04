import * as Sentry from "@sentry/react";

import { env } from "@/env";
import { router } from "./router";
import { isReloadingForNewBuild } from "./stale-build";

const isSentryEnabled = Boolean(env.VITE_SENTRY_DSN);

const TRACES_SAMPLE_RATE = 0.2;

export const initializeSentry = () => {
  if (!isSentryEnabled) {
    return;
  }

  Sentry.init({
    dsn: env.VITE_SENTRY_DSN,
    // The router integration already includes browser tracing; registering
    // both reported every page load and navigation twice.
    integrations: [Sentry.tanstackRouterBrowserTracingIntegration(router)],
    // Full transaction sampling exhausted the org's performance quota (429
    // from ingest). Errors are captured regardless of this rate.
    tracesSampleRate: TRACES_SAMPLE_RATE,
    tracePropagationTargets: [new RegExp(env.VITE_SENTRY_TRACE_PROPAGATION_TARGET_REGEX)],
    // The portal shows participants' personal data, and since v11 the SDK
    // collects user info, cookies, headers, bodies and query params unless
    // told not to. Query params carry participant search terms.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    beforeSend: (event) => {
      return isReloadingForNewBuild() ? null : event;
    },
  });
};

export const getSentryErrorHandlers = () => {
  if (!isSentryEnabled) {
    return {};
  }

  return {
    onUncaughtError: Sentry.reactErrorHandler(),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
  };
};
