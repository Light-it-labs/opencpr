import { createTransport } from "nodemailer";

import { env } from "@/config";

const transport = createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth:
    env.SMTP_USER && env.SMTP_PASSWORD
      ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
      : undefined,
});

export type MailOptions = Parameters<typeof transport.sendMail>[0];

export const sendMail = (options: MailOptions) => transport.sendMail(options);
