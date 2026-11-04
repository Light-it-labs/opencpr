import { createQueryKeys } from "@lukemorales/query-key-factory";

import { getPerformanceStats, getStats } from "./api";
import type { PerformanceStatsFilters, StatsFilters } from "./types";

export const queries = createQueryKeys("stats", {
  detail: (filters: StatsFilters) => {
    return {
      queryKey: [filters],
      queryFn: () => {
        return getStats(filters);
      },
    };
  },
  performance: (filters: PerformanceStatsFilters) => {
    return {
      queryKey: [filters],
      queryFn: () => {
        return getPerformanceStats(filters);
      },
    };
  },
});
