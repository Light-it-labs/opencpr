import { milliseconds } from "date-fns";
import type { Request } from "express";
import rateLimit from "express-rate-limit";

const GENERAL_REQUESTS_PER_MINUTE = 120;
const KIOSK_REQUESTS_PER_MINUTE = 240;

/**
 * What a booth sends on its own: the heartbeat, the poll for its pending
 * registration and the run save. A booth makes about 31 of these a minute, so
 * they get their own budget and cannot be starved by phones or the portal on
 * the same address. Still keyed by IP: the kiosk id in these requests is
 * whatever the caller writes, so keying on it would let anyone mint new ids to
 * escape the limit.
 */
const KIOSK_TRAFFIC = [
  { method: "POST", path: /^\/api\/kiosks\/[^/]+\/heartbeat\/?$/ },
  { method: "GET", path: /^\/api\/cpr-sessions\/[^/]+\/claim\/?$/ },
  { method: "POST", path: /^\/api\/cpr-sessions\/?$/ },
];

const isKioskTraffic = (req: Request) =>
  KIOSK_TRAFFIC.some(
    ({ method, path }) => req.method === method && path.test(req.path),
  );

export const kioskRateLimit = rateLimit({
  windowMs: milliseconds({ minutes: 1 }),
  limit: KIOSK_REQUESTS_PER_MINUTE,
  skip: (req) => !isKioskTraffic(req),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "Too many requests from this booth's network, please try again after a minute",
  },
});

export const generalRateLimit = rateLimit({
  windowMs: milliseconds({ minutes: 1 }),
  limit: GENERAL_REQUESTS_PER_MINUTE,
  skip: isKioskTraffic,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests from this IP, please try again after a minute",
  },
});

export const perMinuteRateLimit = (limit: number) =>
  rateLimit({
    windowMs: milliseconds({ minutes: 1 }),
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests from this IP, please try again after a minute",
    },
  });
