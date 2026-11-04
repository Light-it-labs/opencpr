import { readFileSync } from "node:fs";
import { join } from "node:path";

import { env } from "@/config";

import { sendMail } from "../email/transport";
import { renderTemplate } from "../email/utils";

const MAGIC_LINK_TEMPLATE: string = readFileSync(
  join(process.cwd(), "public", "magic-link-template.html"),
  "utf8",
);

export type MagicLinkEmail = {
  to: string;
  url: string;
  ttlMinutes: number;
};

export const AuthEmailService = {
  /**
   * Sent directly rather than queued: the person is waiting on it, and a
   * retry minutes later would arrive after the link had nearly expired. The
   * url is a credential, so it is passed through and never logged.
   */
  sendMagicLink: async ({ to, ttlMinutes, url }: MagicLinkEmail) => {
    await sendMail({
      to,
      from: { address: env.EMAIL_FROM_ADDRESS, name: "CPR Admin" },
      subject: "Sign in to the OpenCPR admin",
      html: renderTemplate({ url, ttlMinutes }, MAGIC_LINK_TEMPLATE),
    });
  },
};
