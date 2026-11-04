import { startOfDay } from "date-fns";

import { LocationFilterSelect } from "@/components/location-filter-select";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { UNBOUNDED_DATE_RANGE_PRESETS } from "@/constants/date-range-presets";
import type { Location } from "@/services/locations";
import type { PerformanceStatsFilters } from "@/services/stats";
import { formatDateParam, parseDateParam } from "@/utils/date-param";

export type StatisticsFiltersChanges = Partial<PerformanceStatsFilters & { allTime: boolean }>;

type StatisticsFiltersProps = {
  hasFilters: boolean;
  locations: Location[];
  onChange: (changes: StatisticsFiltersChanges) => void;
  value: PerformanceStatsFilters;
};

export const StatisticsFilters = ({
  hasFilters,
  locations,
  onChange,
  value,
}: StatisticsFiltersProps) => {
  const today = startOfDay(new Date());

  return (
    <div className="flex flex-wrap items-center gap-2">
      <LocationFilterSelect
        locations={locations}
        value={value.locationId}
        onChange={(locationId) => {
          return onChange({ locationId });
        }}
      />

      <div className="w-full sm:w-72">
        <DateRangePicker
          disabled={{ after: today }}
          label="Date range"
          placeholder="All time"
          presets={UNBOUNDED_DATE_RANGE_PRESETS}
          value={{ from: parseDateParam(value.dateFrom), to: parseDateParam(value.dateTo) }}
          onChange={(range) => {
            // An empty range (the All time preset or Clear) is All time; the URL keeps
            // `allTime` so it is told apart from the default range.
            return onChange({
              dateFrom: range.from ? formatDateParam(range.from) : undefined,
              dateTo: range.to ? formatDateParam(range.to) : undefined,
              allTime: range.from ? undefined : true,
            });
          }}
        />
      </div>

      {hasFilters ? (
        <Button
          variant="outlined"
          onClick={() => {
            return onChange({
              allTime: undefined,
              locationId: undefined,
              dateFrom: undefined,
              dateTo: undefined,
            });
          }}
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  );
};
