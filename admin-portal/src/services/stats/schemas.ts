import { differenceInCalendarDays, isAfter, parseISO, startOfToday } from "date-fns";
import { z } from "zod";

import { STATS_MAX_RANGE_DAYS } from "./constants";

export const statsTotalsSchema = z.object({
  sessions: z.number(),
  participants: z.number(),
  kiosksOnline: z.number(),
  kiosksTotal: z.number(),
  averageScore: z.number().nullable(),
});

export const dailyStatSchema = z.object({
  date: z.string(),
  count: z.number(),
  averageScore: z.number().nullable(),
});

export const locationStatSchema = z.object({
  locationId: z.string(),
  name: z.string(),
  count: z.number(),
  averageScore: z.number().nullable(),
});

export const statsSchema = z.object({
  totals: statsTotalsSchema,
  sessionsPerDay: z.array(dailyStatSchema),
  perLocation: z.array(locationStatSchema),
});

export const statsResponseSchema = z.object({ data: statsSchema });

export const statsFiltersSchema = z
  .object({
    dateFrom: z.iso.date().optional(),
    dateTo: z.iso.date().optional(),
    locationId: z.string().optional(),
  })
  .superRefine((filters, context) => {
    // No start date is All time and unbounded. A start date alone runs to today,
    // as on the API, so it is held to the same cap.
    if (!filters.dateFrom) {
      return;
    }

    const start = parseISO(filters.dateFrom);
    const end = filters.dateTo ? parseISO(filters.dateTo) : startOfToday();

    if (isAfter(start, end)) {
      context.addIssue({
        code: "custom",
        path: ["dateTo"],
        message: "The start date must be on or before the end date",
      });

      return;
    }

    if (differenceInCalendarDays(end, start) + 1 > STATS_MAX_RANGE_DAYS) {
      context.addIssue({
        code: "custom",
        path: ["dateTo"],
        message: `Choose a range of at most ${STATS_MAX_RANGE_DAYS} days`,
      });
    }
  });

export const performanceStatsFiltersSchema = z
  .object({
    locationId: z.string().optional(),
    dateFrom: z.iso.date().optional(),
    dateTo: z.iso.date().optional(),
  })
  .superRefine((filters, context) => {
    if (
      filters.dateFrom &&
      filters.dateTo &&
      isAfter(parseISO(filters.dateFrom), parseISO(filters.dateTo))
    ) {
      context.addIssue({
        code: "custom",
        path: ["dateTo"],
        message: "The start date must be on or before the end date",
      });
    }
  });

const nullableNumberSchema = z.number().nullable();

export const attemptStatSchema = z.object({
  attempt: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  sessions: z.number(),
  averageScore: nullableNumberSchema,
});

export const distributionBucketSchema = z.object({
  label: z.string(),
  sessions: z.number(),
});

export const distributionSchema = z.object({
  buckets: z.array(distributionBucketSchema),
  inRangeShare: nullableNumberSchema,
});

export const hourStatSchema = z.object({
  hour: z.number(),
  sessions: z.number(),
  averageScore: nullableNumberSchema,
});

export const topSessionSchema = z.object({
  sessionId: z.number(),
  participantName: z.string().nullable(),
  score: z.number(),
  createdAt: z.iso.datetime(),
  locationName: z.string(),
});

export const performanceStatsSchema = z.object({
  range: z.object({
    dateFrom: z.string().nullable(),
    dateTo: z.string().nullable(),
    locationId: z.string().nullable(),
  }),
  totals: z.object({
    sessions: z.number(),
    participants: z.number(),
    registrations: z.number(),
    compressions: z.number(),
    handsOnSeconds: z.number(),
    averageScore: nullableNumberSchema,
    repeaters: z.number(),
  }),
  retry: z.object({
    repeaters: z.number(),
    improved: z.number(),
    slipped: z.number(),
    level: z.number(),
    firstAttemptAverage: nullableNumberSchema,
    lastAttemptAverage: nullableNumberSchema,
    byAttempt: z.array(attemptStatSchema),
  }),
  funnel: z.object({
    registrations: z.number(),
    claimedSessions: z.number(),
    unclaimedSessions: z.number(),
    participants: z.number(),
    claimedAverageScore: nullableNumberSchema,
    unclaimedAverageScore: nullableNumberSchema,
    claimedAverageDepthMm: nullableNumberSchema,
    unclaimedAverageDepthMm: nullableNumberSchema,
  }),
  depth: distributionSchema,
  rate: distributionSchema,
  scoreBands: z.object({ high: z.number(), medium: z.number(), low: z.number() }),
  quality: z.object({
    fullDepthShare: nullableNumberSchema,
    fullRecoilShare: nullableNumberSchema,
    onRateShare: nullableNumberSchema,
  }),
  byHour: z.array(hourStatSchema),
  topSessions: z.array(topSessionSchema),
});

export const performanceStatsResponseSchema = z.object({ data: performanceStatsSchema });
