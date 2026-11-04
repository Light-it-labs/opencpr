import { startOfDay } from "date-fns";

import { LocationFilterSelect } from "@/components/location-filter-select";
import { Button } from "@/components/ui/button";
import { SearchTextInput } from "@/components/ui/data-table/search-text-input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { UNBOUNDED_DATE_RANGE_PRESETS } from "@/constants/date-range-presets";
import type { Location } from "@/services/locations";
import { formatDateParam, parseDateParam } from "@/utils/date-param";

export type SessionsFiltersValue = {
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
  searchText?: string;
  sort?: string;
};

type SessionsFiltersProps = {
  hasFilters: boolean;
  locations: Location[];
  onChange: (changes: Partial<SessionsFiltersValue>) => void;
  value: SessionsFiltersValue;
};

export const SessionsFilters = ({
  hasFilters,
  locations,
  onChange,
  value,
}: SessionsFiltersProps) => {
  const today = startOfDay(new Date());

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchTextInput path="/_private/sessions/" placeholder="Search by name or email" />

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
            return onChange({
              dateFrom: range.from ? formatDateParam(range.from) : undefined,
              dateTo: range.to ? formatDateParam(range.to) : undefined,
            });
          }}
        />
      </div>

      {hasFilters || value.sort ? (
        <Button
          variant="outlined"
          onClick={() => {
            return onChange({
              locationId: undefined,
              dateFrom: undefined,
              dateTo: undefined,
              searchText: undefined,
              sort: undefined,
            });
          }}
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  );
};
