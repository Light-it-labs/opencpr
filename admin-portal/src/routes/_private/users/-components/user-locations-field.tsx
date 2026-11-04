import { useMemo } from "react";

import { ErrorMessage } from "@/components/ui/error-message";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select/multi-select";
import { useAdminLocations } from "@/services/locations";

type UserLocationsFieldProps = {
  errorMessage?: string;
  id: string;
  onChange: (locationIds: string[]) => void;
  value: string[];
};

export const UserLocationsField = ({
  errorMessage,
  id,
  onChange,
  value,
}: UserLocationsFieldProps) => {
  const { data: locations, isLoading } = useAdminLocations();

  const options = useMemo(() => {
    return (locations ?? []).map((location) => {
      return { label: location.name, value: location.id };
    });
  }, [locations]);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Locations</Label>

      <MultiSelect
        emptyMessage="No locations found."
        id={id}
        isLoading={isLoading}
        options={options}
        placeholder="All locations"
        searchPlaceholder="Search locations..."
        value={value}
        onChange={onChange}
      />

      <p className="text-xs text-text-default-secondary">
        Leave empty to let this viewer see every location.
      </p>

      <ErrorMessage errorMessage={errorMessage} />
    </div>
  );
};
