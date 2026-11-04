import { UTCDate } from "@date-fns/utc";
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  isAfter,
  startOfDay,
  subDays,
} from "date-fns";

import { BadRequestError } from "@/exceptions";
import { KiosksLogic } from "@/logic";
import { CprSessionsRepository, ParticipantsRepository } from "@/repositories";
import { PerformanceStatsQuery, StatsQuery } from "@/schemas";
import { AuthenticatedUser } from "@/types";

import { aggregateDashboardStats } from "./dashboard-stats";
import { scopeLocationIds } from "./location-scope";
import { aggregatePerformance, pickTopSessions } from "./performance-stats";

const MAX_RANGE_DAYS = 366;

const assertOrderedRange = (from?: Date, to?: Date) => {
  if (from && to && isAfter(from, to)) {
    throw new BadRequestError("dateFrom must not be after dateTo");
  }
};

/**
 * The range as calendar days. Without dateFrom it reaches back to the day of
 * the first run in scope (all time), so only an explicit range is capped. The
 * bounds are UTC instants whose UTC dates are the days the admin asked for;
 * UTCDate keeps the day math independent of the server's timezone.
 */
const resolveRange = async (
  { dateFrom, dateTo }: StatsQuery,
  locationIds?: string[],
) => {
  const to = new UTCDate(dateTo ?? endOfDay(new UTCDate()));

  if (dateFrom) {
    const from = new UTCDate(dateFrom);

    assertOrderedRange(from, to);

    if (differenceInCalendarDays(to, from) >= MAX_RANGE_DAYS) {
      throw new BadRequestError(
        `The range cannot exceed ${MAX_RANGE_DAYS} days.`,
      );
    }

    return { from, to };
  }

  // No runs yet, or none before dateTo: an empty range ending on dateTo's day
  // rather than a 400 for a question the caller never asked.
  const firstCreatedAt = await CprSessionsRepository.statsFirstCreatedAt({
    locationIds,
  });
  const from = startOfDay(
    firstCreatedAt && !isAfter(firstCreatedAt, to)
      ? new UTCDate(firstCreatedAt)
      : to,
  );

  return { from, to };
};

export const StatsLogic = {
  get: async (user: AuthenticatedUser, query: StatsQuery) => {
    const locationIds = scopeLocationIds(user, query.locationId);
    const { from, to } = await resolveRange(query, locationIds);

    // Days are each session's local day in its location's timezone, which may
    // differ from the UTC day: fetch a day more on each side and let the
    // aggregation keep the runs whose local day falls inside the range.
    const [sessions, kiosks] = await Promise.all([
      CprSessionsRepository.listForStats({
        locationIds,
        dateFrom: new UTCDate(subDays(from, 1)),
        dateTo: new UTCDate(addDays(to, 1)),
      }),
      KiosksLogic.list(locationIds),
    ]);

    const { perLocation, sessionsPerDay, totals } = aggregateDashboardStats({
      from,
      sessions,
      to,
    });

    return {
      totals: {
        ...totals,
        kiosksOnline: kiosks.filter((kiosk) => kiosk.online).length,
        kiosksTotal: kiosks.length,
      },
      sessionsPerDay,
      perLocation,
    };
  },

  /**
   * The report figures over an open range: no default and no cap, since
   * "all time" is a legitimate question here. Rows are aggregated in memory;
   * only the names of the top runs' participants need a second lookup.
   */
  performance: async (
    user: AuthenticatedUser,
    query: PerformanceStatsQuery,
  ) => {
    assertOrderedRange(query.dateFrom, query.dateTo);

    const sessions = await CprSessionsRepository.listForPerformance({
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      locationIds: scopeLocationIds(user, query.locationId),
    });
    const topParticipantIds = pickTopSessions(sessions).flatMap((session) =>
      session.participantId ? [session.participantId] : [],
    );

    const participantNames =
      await ParticipantsRepository.listNamesByIds(topParticipantIds);

    return aggregatePerformance({
      participantNames,
      range: query,
      sessions,
    });
  },
};
