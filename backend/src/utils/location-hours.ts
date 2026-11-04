import { TZDate } from "@date-fns/tz";
import { UTCDate } from "@date-fns/utc";
import { format, isBefore, parse, startOfDay } from "date-fns";

import { Location } from "@/models";

export type MonitoredLocation = Pick<
  Location,
  | "startDate"
  | "endDate"
  | "opensAt"
  | "closesAt"
  | "timezone"
  | "deletedAt"
  | "alertsEnabled"
>;

const CALENDAR_DAY = "yyyy-MM-dd";

/** MySQL `time` comes back as `HH:mm:ss`; seconds are never meaningful here. */
export const toHourMinute = (time: string | null): string | null =>
  time && time.slice(0, 5);

/**
 * Midnight of `now`'s calendar day in the location's timezone, as a plain
 * Date: a TZDate serializes with its offset, which Drizzle's MySQL timestamp
 * mapping cannot parse.
 */
export const startOfLocalDay = (timezone: string, now: Date): Date =>
  new Date(startOfDay(new TZDate(now, timezone)));

/**
 * Whether a kiosk at this location is expected to be up at `now`: the location
 * exists and has alerts enabled, today (in its own timezone) is within its
 * dates, and the local time is inside the daily window [opensAt, closesAt). A
 * window that closes before it opens runs through midnight. No hours means
 * open around the clock.
 */
export const isLocationMonitoredAt = (
  location: MonitoredLocation | undefined,
  now: Date,
): boolean => {
  if (!location || location.deletedAt || !location.alertsEnabled) {
    return false;
  }

  const { closesAt, endDate, opensAt, startDate, timezone } = location;
  const local = new TZDate(now, timezone);

  // startDate/endDate are calendar days stored as midnight UTC, so their UTC
  // date is the intended day; compare it with today's date in the location's
  // timezone rather than shifting the stored instant into that timezone.
  const today = format(local, CALENDAR_DAY);

  if (today < format(new UTCDate(startDate), CALENDAR_DAY)) {
    return false;
  }

  if (endDate && today > format(new UTCDate(endDate), CALENDAR_DAY)) {
    return false;
  }

  if (!opensAt || !closesAt) {
    return true;
  }

  const opens = parse(toHourMinute(opensAt) ?? "", "HH:mm", local);
  const closes = parse(toHourMinute(closesAt) ?? "", "HH:mm", local);
  const started = !isBefore(local, opens);
  const notEnded = isBefore(local, closes);

  return isBefore(closes, opens) ? started || notEnded : started && notEnded;
};
