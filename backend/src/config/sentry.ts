import * as Sentry from "@sentry/node";
import { ZodError } from "zod";

import { redact } from "../utils/redact";
import { StatusCodes } from "./status-codes";

/**
 * Must be initialized before the modules it instruments are imported, which is
 * why the entry point loads this first and why it reads process.env directly
 * rather than going through the validated env — that module pulls in the rest of
 * the config graph.
 */
const dsn = process.env.SENTRY_DSN;

export const isSentryEnabled = Boolean(dsn);

const SENSITIVE_KEY_PARTS = ["forwarded", "-ip", "remote-", "via", "-user"];

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
    // Leaving this unset would collect user details, cookies, bodies and query
    // data. Request bodies carry participants' registration details and
    // sign-in emails, and cookies carry the admin session, so none of them are
    // attached to events.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {
        request: { deny: SENSITIVE_KEY_PARTS },
        response: { deny: SENSITIVE_KEY_PARTS },
      },
      httpBodies: [],
      // Admin search params carry names and emails.
      urlQueryParams: false,
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      graphQL: { document: false, variables: false },
    },
    beforeSend: (event) => {
      event.exception?.values?.forEach((exception) => {
        if (exception.value) exception.value = redact(exception.value);
      });

      return event;
    },
    integrations: [
      Sentry.httpIntegration({ maxRequestBodySize: "none" }),
      // Sentry counts an error without an HTTP status as a 500. A ZodError has
      // none, but the error handler answers it with a 400, so it is the
      // caller's mistake.
      Sentry.expressIntegration({
        shouldHandleError: (error) =>
          !(error instanceof ZodError) &&
          Number(
            error.status ?? error.statusCode ?? StatusCodes.SERVER_ERROR,
          ) >= StatusCodes.SERVER_ERROR,
      }),
    ],
  });
};

export { Sentry };
