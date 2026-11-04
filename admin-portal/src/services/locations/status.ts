import { TZDate } from "@date-fns/tz";
import { isAfter, isBefore, parse, startOfDay } from "date-fns";

import { parseCalendarDate } from "@/utils/calendar-date";

export type LocationStatus = "active" | "closed" | "ended" | "upcoming";

type LocationSchedule = {
  closesAt: string | null;
  endDate: string | null;
  opensAt: string | null;
  startDate: string;
  timezone: string;
};

/** Start and end dates are calendar days: anchor them to midnight in the location's timezone. */
const toLocalDay = (iso: string, timezone: string) => {
  const day = parseCalendarDate(iso);

  return new TZDate(day.getFullYear(), day.getMonth(), day.getDate(), timezone);
};

/**
 * Where a location stands at `now`: before its first day, after its last day,
 * outside today's opening window, or open. A window that closes before it opens
 * runs through midnight; no hours means open around the clock.
 */
export const getLocationStatus = (location: LocationSchedule, now: Date): LocationStatus => {
  const { closesAt, endDate, opensAt, startDate, timezone } = location;
  const local = new TZDate(now, timezone);
  const today = startOfDay(local);

  if (isBefore(today, toLocalDay(startDate, timezone))) {
    return "upcoming";
  }

  if (endDate && isAfter(today, toLocalDay(endDate, timezone))) {
    return "ended";
  }

  if (!opensAt || !closesAt) {
    return "active";
  }

  const opens = parse(opensAt, "HH:mm", local);
  const closes = parse(closesAt, "HH:mm", local);
  const started = !isBefore(local, opens);
  const notEnded = isBefore(local, closes);
  const isOpen = isBefore(closes, opens) ? started || notEnded : started && notEnded;

  return isOpen ? "active" : "closed";
};
