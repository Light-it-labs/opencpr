import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",

  client: {
    VITE_APP_NAME: z.string().min(1),
    VITE_APP_ENV: z.enum(["local", "development", "staging", "production"]).default("local"),
    VITE_API_URL: z.url(),

    VITE_SENTRY_DSN: z.string().optional(),
    /*
     * Sentry's org, project and auth token are build-time only and are read
     * from process.env in vite.config.ts. A VITE_ prefix exposes a variable to
     * the browser, and declaring the token here inlined it into the bundle.
     */
    VITE_SENTRY_TRACE_PROPAGATION_TARGET_REGEX: z.string().optional().default(""),

    VITE_ENABLE_DEVTOOLS: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => {
        return value === "true";
      }),
  },

  runtimeEnv: import.meta.env,

  emptyStringAsUndefined: true,
});
