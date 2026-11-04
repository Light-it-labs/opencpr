import { api } from "@/config/axios";
import { performanceStatsResponseSchema, statsResponseSchema } from "./schemas";
import type { PerformanceStats, PerformanceStatsFilters, Stats, StatsFilters } from "./types";

export const getStats = async (filters: StatsFilters): Promise<Stats> => {
  const response = await api.get("admin/stats", { params: filters });

  return statsResponseSchema.parse(response.data).data;
};

export const getPerformanceStats = async (
  filters: PerformanceStatsFilters,
): Promise<PerformanceStats> => {
  const response = await api.get("admin/stats/performance", { params: filters });

  return performanceStatsResponseSchema.parse(response.data).data;
};
