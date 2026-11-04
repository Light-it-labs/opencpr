import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { UseQueryProps } from "@/services/types";
import { queries } from "./factories";
import type { PerformanceStatsFilters, StatsFilters } from "./types";

export const useStats = (filters: StatsFilters, props?: UseQueryProps<typeof queries.detail>) => {
  return useQuery({ ...queries.detail(filters), placeholderData: keepPreviousData, ...props });
};

export const usePerformanceStats = (
  filters: PerformanceStatsFilters,
  props?: UseQueryProps<typeof queries.performance>,
) => {
  return useQuery({ ...queries.performance(filters), placeholderData: keepPreviousData, ...props });
};
