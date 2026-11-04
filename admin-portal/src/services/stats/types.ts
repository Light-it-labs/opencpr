import type { z } from "zod";

import type {
  attemptStatSchema,
  dailyStatSchema,
  distributionBucketSchema,
  hourStatSchema,
  locationStatSchema,
  performanceStatsFiltersSchema,
  performanceStatsSchema,
  statsFiltersSchema,
  statsSchema,
  topSessionSchema,
} from "./schemas";

export type Stats = z.infer<typeof statsSchema>;

export type DailyStat = z.infer<typeof dailyStatSchema>;

export type LocationStat = z.infer<typeof locationStatSchema>;

export type StatsFilters = z.infer<typeof statsFiltersSchema>;

export type PerformanceStats = z.infer<typeof performanceStatsSchema>;

export type PerformanceStatsFilters = z.infer<typeof performanceStatsFiltersSchema>;

export type AttemptStat = z.infer<typeof attemptStatSchema>;

export type DistributionBucket = z.infer<typeof distributionBucketSchema>;

export type HourStat = z.infer<typeof hourStatSchema>;

export type TopSession = z.infer<typeof topSessionSchema>;
