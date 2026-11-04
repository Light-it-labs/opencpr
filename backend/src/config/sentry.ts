import * as Sentry from "@sentry/node";

/**
 * Must be initialized before the modules it instruments are imported, which is
 * why the entry point loads this first and why it reads process.env directly
 * rather than going through the validated env — that module pulls in the rest of
 * the config graph.
 */
const dsn = process.env.SENTRY_DSN;

export const isSentryEnabled = Boolean(dsn);

export const initializeSentry = () => {
  if (!isSentryEnabled) {
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.APP_ENV ?? "local",
    // Optional: `sentry-cli sourcemaps inject` stamps debug IDs into the build,
    // which match events to files without needing this. Set it if you want
    // releases grouped in the Sentry UI.
    release: process.env.SENTRY_RELEASE,
    // The admin portal hit Sentry's rate limit (429) at full sampling.
    tracesSampleRate: 0.2,
    sendDefaultPii: false,
    // Request bodies carry participants' registration details and sign-in
    // emails, so none of them are attached to events.
    integrations: [
      Sentry.httpIntegration({ maxIncomingRequestBodySize: "none" }),
    ],
  });
};

export { Sentry };
