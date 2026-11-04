import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  isAfter,
  isSameYear,
  startOfMonth,
  startOfToday,
  startOfWeek,
} from "date-fns";

import type { DailyStat } from "@/services/stats";
import { formatDateParam, parseDateParam } from "@/utils/date-param";
import { formatDay } from "@/utils/format-day";

/** Ranges up to this many days chart one bar per day. */
const DAY_BUCKET_MAX_DAYS = 92;

/** Ranges up to this many days chart one bar per week; longer ones chart one per month. */
const WEEK_BUCKET_MAX_DAYS = 731;

const SERIES_BUCKET = { DAY: "day", WEEK: "week", MONTH: "month" } as const;

export type SeriesBucket = (typeof SERIES_BUCKET)[keyof typeof SERIES_BUCKET];

export type SessionSeries = {
  bucket: SeriesBucket;
  points: DailyStat[];
  spansYears: boolean;
};

const BUCKET_HEADERS = {
  [SERIES_BUCKET.DAY]: "Date",
  [SERIES_BUCKET.WEEK]: "Week",
  [SERIES_BUCKET.MONTH]: "Month",
} as const;

const getBucket = (rangeDays: number): SeriesBucket => {
  if (rangeDays <= DAY_BUCKET_MAX_DAYS) {
    return SERIES_BUCKET.DAY;
  }

  return rangeDays <= WEEK_BUCKET_MAX_DAYS ? SERIES_BUCKET.WEEK : SERIES_BUCKET.MONTH;
};

const toBucketDate = (date: Date, bucket: SeriesBucket) => {
  if (bucket === SERIES_BUCKET.WEEK) {
    return startOfWeek(date);
  }

  return bucket === SERIES_BUCKET.MONTH ? startOfMonth(date) : date;
};

const eachBucketOfInterval = (start: Date, end: Date, bucket: SeriesBucket) => {
  if (bucket === SERIES_BUCKET.WEEK) {
    return eachWeekOfInterval({ start, end });
  }

  return bucket === SERIES_BUCKET.MONTH
    ? eachMonthOfInterval({ start, end })
    : eachDayOfInterval({ start, end });
};

/**
 * Groups the daily stats into day, week or month buckets over the explicit range, or over the
 * returned days for All time. A bucket's average score is the session-weighted
 * mean of its days.
 */
export const buildSessionSeries = (
  days: DailyStat[],
  dateFrom?: string,
  dateTo?: string,
): SessionSeries => {
  const start = parseDateParam(dateFrom) ?? parseDateParam(days[0]?.date);
  // A start date alone runs to today, as on the API; only All time follows the returned days.
  const end =
    parseDateParam(dateTo) ?? (dateFrom ? startOfToday() : parseDateParam(days.at(-1)?.date));

  if (!start || !end || isAfter(start, end)) {
    return { bucket: SERIES_BUCKET.DAY, points: days, spansYears: false };
  }

  const bucket = getBucket(differenceInCalendarDays(end, start) + 1);

  const totals = new Map(
    eachBucketOfInterval(start, end, bucket).map((date) => {
      return [formatDateParam(date), { count: 0, scoredCount: 0, scoreSum: 0 }];
    }),
  );

  days.forEach((day) => {
    const date = parseDateParam(day.date);
    const total = date ? totals.get(formatDateParam(toBucketDate(date, bucket))) : undefined;

    if (!total) {
      return;
    }

    total.count += day.count;

    if (day.averageScore !== null) {
      total.scoredCount += day.count;
      total.scoreSum += day.averageScore * day.count;
    }
  });

  const points = [...totals].map(([date, total]) => {
    return {
      date,
      count: total.count,
      averageScore: total.scoredCount > 0 ? total.scoreSum / total.scoredCount : null,
    };
  });

  return { bucket, points, spansYears: !isSameYear(start, end) };
};

export const formatBucketTick = (date: string, series: SessionSeries) => {
  if (series.bucket === SERIES_BUCKET.MONTH) {
    return formatDay(date, "MMM yyyy");
  }

  return formatDay(date, series.spansYears ? "MMM d, yyyy" : "MMM d");
};

export const formatBucketLabel = (date: string, bucket: SeriesBucket) => {
  if (bucket === SERIES_BUCKET.WEEK) {
    return `Week of ${formatDay(date, "PP")}`;
  }

  return formatDay(date, bucket === SERIES_BUCKET.MONTH ? "MMMM yyyy" : "PP");
};

export const getBucketHeader = (bucket: SeriesBucket) => {
  return BUCKET_HEADERS[bucket];
};
