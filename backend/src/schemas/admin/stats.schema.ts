import z from "zod";

import { dateRangeFields } from "./common.schema";

export const statsQuerySchema = z.object({
  locationId: z.uuid().optional(),
  ...dateRangeFields,
});

export type StatsQuery = z.infer<typeof statsQuerySchema>;

// Same filters as the dashboard, but here a missing date means all time: the
// logic adds no default range and no cap.
export const performanceStatsQuerySchema = z.object({
  locationId: z.uuid().optional(),
  ...dateRangeFields,
});

export type PerformanceStatsQuery = z.infer<typeof performanceStatsQuerySchema>;
