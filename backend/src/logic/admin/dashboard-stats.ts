import { TZDate } from "@date-fns/tz";
import { eachDayOfInterval, format } from "date-fns";

/**
 * Pure aggregation for `GET /admin/stats`: the dashboard tiles, the daily
 * series and the per-location table computed in memory over a lightweight
 * session projection. Days are each session's local calendar day in its
 * location's timezone, so a 21:30 run in New York counts on that day and not,
 * as a UTC grouping would have it, on the next one.
 */

export type DashboardSession = {
  id: number;
  participantId: string | null;
  locationId: string;
  createdAt: Date;
  score: number;
  location: { name: string; timezone: string };
};

const DAY = "yyyy-MM-dd";

const round = (value: number) => Math.round(value * 100) / 100;

/** Two decimals, 0 when there is nothing to average. */
const averageScore = (sessions: DashboardSession[]) =>
  sessions.length
    ? round(
        sessions.reduce((total, session) => total + session.score, 0) /
          sessions.length,
      )
    : 0;

const localDay = ({ createdAt, location }: DashboardSession) =>
  format(new TZDate(createdAt, location.timezone), DAY);

/**
 * The range's calendar days, read from the UTC instants the query produced:
 * `dateFrom` is UTC midnight and `dateTo` the UTC end of day of the days the
 * admin typed, so their UTC dates are those days whatever the server's zone.
 */
const calendarDays = (from: Date, to: Date) =>
  eachDayOfInterval({ start: from, end: to }).map((day) => format(day, DAY));

const appendTo = <T>(groups: Map<string, T[]>, key: string, value: T) => {
  const group = groups.get(key);

  if (group) {
    group.push(value);
  } else {
    groups.set(key, [value]);
  }
};

export const aggregateDashboardStats = ({
  from,
  sessions,
  to,
}: {
  sessions: DashboardSession[];
  from: Date;
  to: Date;
}) => {
  const days = calendarDays(from, to);
  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  // The rows come from a window one day wider than the range on each side;
  // only those whose local day falls inside the range belong to it.
  const byDay = new Map<string, DashboardSession[]>();
  sessions.forEach((session) => {
    const day = localDay(session);

    if (firstDay && lastDay && day >= firstDay && day <= lastDay) {
      appendTo(byDay, day, session);
    }
  });
  const inRange = [...byDay.values()].flat();

  const byLocation = new Map<string, DashboardSession[]>();
  inRange.forEach((session) => {
    appendTo(byLocation, session.locationId, session);
  });

  return {
    totals: {
      sessions: inRange.length,
      participants: new Set(
        inRange.flatMap((session) =>
          session.participantId ? [session.participantId] : [],
        ),
      ).size,
      averageScore: averageScore(inRange),
    },
    // Days without a run get a zero row so the chart's x axis stays continuous.
    sessionsPerDay: days.map((date) => {
      const runs = byDay.get(date) ?? [];

      return { date, count: runs.length, averageScore: averageScore(runs) };
    }),
    perLocation: [...byLocation.entries()]
      .map(([locationId, runs]) => ({
        locationId,
        name: runs[0]!.location.name,
        count: runs.length,
        averageScore: averageScore(runs),
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
};
