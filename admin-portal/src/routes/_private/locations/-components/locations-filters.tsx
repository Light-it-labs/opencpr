import { Button } from "@/components/ui/button";
import { SearchTextInput } from "@/components/ui/data-table/search-text-input";

type LocationsFiltersProps = {
  hasFilters: boolean;
  onClear: () => void;
};

export const LocationsFilters = ({ hasFilters, onClear }: LocationsFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchTextInput path="/_private/locations/" placeholder="Search by name" />

      {hasFilters ? (
        <Button variant="outlined" onClick={onClear}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
};
