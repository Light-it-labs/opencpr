import { LocationFilterSelect } from "@/components/location-filter-select";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  KIOSK_SENSOR_FILTER,
  KIOSK_SENSOR_FILTER_LABEL,
  KIOSK_STATUS_FILTER,
  KIOSK_STATUS_FILTER_LABEL,
  type KioskSensorFilter,
  type KioskStatusFilter,
} from "@/services/kiosks";
import type { Location } from "@/services/locations";

export type KiosksFiltersValue = {
  locationId?: string;
  sensor?: KioskSensorFilter;
  status?: KioskStatusFilter;
};

type KiosksFiltersProps = {
  hasFilters: boolean;
  locations: Location[];
  onChange: (changes: Partial<KiosksFiltersValue>) => void;
  onClear: () => void;
  value: KiosksFiltersValue;
};

export const KiosksFilters = ({
  hasFilters,
  locations,
  onChange,
  onClear,
  value,
}: KiosksFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select.Root
        value={value.status ?? KIOSK_STATUS_FILTER.ALL}
        onValueChange={(next) => {
          const status = Object.values(KIOSK_STATUS_FILTER).find((option) => {
            return option === next;
          });

          return onChange({ status: status === KIOSK_STATUS_FILTER.ALL ? undefined : status });
        }}
      >
        <Select.Trigger aria-label="Status">
          <Select.Value />
        </Select.Trigger>

        <Select.Content>
          {Object.values(KIOSK_STATUS_FILTER).map((option) => {
            return (
              <Select.Item key={option} value={option}>
                {KIOSK_STATUS_FILTER_LABEL[option]}
              </Select.Item>
            );
          })}
        </Select.Content>
      </Select.Root>

      <Select.Root
        value={value.sensor ?? KIOSK_SENSOR_FILTER.ALL}
        onValueChange={(next) => {
          const sensor = Object.values(KIOSK_SENSOR_FILTER).find((option) => {
            return option === next;
          });

          return onChange({ sensor: sensor === KIOSK_SENSOR_FILTER.ALL ? undefined : sensor });
        }}
      >
        <Select.Trigger aria-label="Sensor">
          <Select.Value />
        </Select.Trigger>

        <Select.Content>
          {Object.values(KIOSK_SENSOR_FILTER).map((option) => {
            return (
              <Select.Item key={option} value={option}>
                {KIOSK_SENSOR_FILTER_LABEL[option]}
              </Select.Item>
            );
          })}
        </Select.Content>
      </Select.Root>

      <LocationFilterSelect
        locations={locations}
        value={value.locationId}
        onChange={(locationId) => {
          return onChange({ locationId });
        }}
      />

      {hasFilters ? (
        <Button variant="outlined" onClick={onClear}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
};
