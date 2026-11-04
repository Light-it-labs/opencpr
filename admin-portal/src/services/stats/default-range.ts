import { startOfDay, subDays } from "date-fns";

import { formatDateParam } from "@/utils/date-param";
import { STATS_DEFAULT_RANGE_DAYS } from "./constants";

/** The default range when the URL carries no dates: the "Last 30 days" preset, today included. */
export const getDefaultDateRange = () => {
  const today = startOfDay(new Date());

  return {
    dateFrom: formatDateParam(subDays(today, STATS_DEFAULT_RANGE_DAYS - 1)),
    dateTo: formatDateParam(today),
  };
};
