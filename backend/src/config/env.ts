import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const integer = z
  .string()
  .transform((s) => parseInt(s, 10))
  .pipe(z.number());

export const env = createEnv({
  server: {
    APP_ENV: z
      .enum(["local", "development", "staging", "production"])
      .default("local"),
    APP_PORT: integer.default(8080),

    /** Unset disables reporting entirely. */
    SENTRY_DSN: z.string().optional(),

    MYSQL_HOST: z.string().min(1),
    MYSQL_PORT: integer,
    MYSQL_USER: z.string().min(1),
    MYSQL_PASSWORD: z.string().min(1),
    MYSQL_DATABASE: z.string().min(1),

    REDIS_HOST: z.string().min(1).default("localhost"),
    REDIS_PORT: integer.default(6379),

    EMAIL_FROM_ADDRESS: z.email(),

    /** Port 465 needs SMTP_SECURE=true; 587 keeps it false and upgrades with STARTTLS. */
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: integer.default(587),
    SMTP_SECURE: z.stringbool().default(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),

    /**
     * Origin the admin app is served from. Magic links point here, and it is
     * the only origin a passkey ceremony is accepted from.
     */
    ADMIN_APP_URL: z.url(),
    /**
     * WebAuthn relying party id: the registrable domain the admin lives on
     * (e.g. example.com), never a URL. A passkey is bound to it for life, so
     * there is no default: a deployment quietly falling back to localhost would
     * enrol credentials that can never be used.
     */
    ADMIN_RP_ID: z.string().min(1),
    /**
     * Nobody can invite the first portal user, so this email is created as an
     * admin on boot and by the local seed. Further users are invited from the
     * portal.
     */
    BOOTSTRAP_ADMIN_EMAIL: z.email(),
  },
  createFinalSchema: (shape) =>
    z
      .object(shape)
      .refine(({ SMTP_PASSWORD, SMTP_USER }) => !SMTP_USER === !SMTP_PASSWORD, {
        message: "SMTP_USER and SMTP_PASSWORD must be set together",
        path: ["SMTP_PASSWORD"],
      }),
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
