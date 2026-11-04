import { Select } from "@/components/ui/select";
import { useIsSingleLocationScope } from "@/services/auth";
import { type Location, sortByStartDateDesc } from "@/services/locations";

const ALL_LOCATIONS = "all";

type LocationFilterSelectProps = {
  locations: Location[];
  onChange: (locationId: string | undefined) => void;
  value: string | undefined;
};

export const LocationFilterSelect = ({ locations, onChange, value }: LocationFilterSelectProps) => {
  const isSingleLocationScope = useIsSingleLocationScope();

  if (isSingleLocationScope) {
    return null;
  }

  return (
    <Select.Root
      value={value ?? ALL_LOCATIONS}
      onValueChange={(next) => {
        return onChange(next === ALL_LOCATIONS ? undefined : next);
      }}
    >
      <Select.Trigger aria-label="Location">
        <Select.Value />
      </Select.Trigger>

      <Select.Content>
        <Select.Item value={ALL_LOCATIONS}>All locations</Select.Item>

        {sortByStartDateDesc(locations).map((location) => {
          return (
            <Select.Item key={location.id} value={location.id}>
              {location.name}
            </Select.Item>
          );
        })}
      </Select.Content>
    </Select.Root>
  );
};
