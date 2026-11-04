import { CookieOptions, Request, Response } from "express";

import { env } from "@/config";

export const SESSION_COOKIE = "sid";

const options: CookieOptions = {
  // Unreadable from page scripts, so an XSS bug cannot lift the session.
  httpOnly: true,
  // Local development runs over plain http.
  secure: env.APP_ENV !== "local",
  // Lax keeps the cookie off cross-site POSTs, which is the CSRF defense here.
  sameSite: "lax",
  path: "/",
};

export const CookieService = {
  set: (res: Response, value: string, maxAgeMs: number) => {
    res.cookie(SESSION_COOKIE, value, { ...options, maxAge: maxAgeMs });
  },

  get: (req: Request): string | undefined => {
    const value: unknown = req.cookies?.[SESSION_COOKIE];

    return typeof value === "string" && value ? value : undefined;
  },

  clear: (res: Response) => {
    res.clearCookie(SESSION_COOKIE, options);
  },
};
