import { LocationFilterSelect } from "@/components/location-filter-select";
import { SearchTextInput } from "@/components/ui/data-table/search-text-input";
import type { Location } from "@/services/locations";

type ParticipantsFiltersProps = {
  locationId: string | undefined;
  locations: Location[];
  onLocationChange: (locationId: string | undefined) => void;
};

export const ParticipantsFilters = ({
  locationId,
  locations,
  onLocationChange,
}: ParticipantsFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchTextInput path="/_private/participants/" placeholder="Search by name or email" />

      <LocationFilterSelect locations={locations} value={locationId} onChange={onLocationChange} />
    </div>
  );
};
