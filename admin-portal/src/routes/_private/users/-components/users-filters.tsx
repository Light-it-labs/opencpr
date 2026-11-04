import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  USER_STATUS_FILTER,
  USER_STATUS_FILTER_LABEL,
  type UserStatusFilter,
} from "@/services/users";

type UsersFiltersProps = {
  onChange: (status: UserStatusFilter | undefined) => void;
  onClear: () => void;
  status?: UserStatusFilter;
};

export const UsersFilters = ({ onChange, onClear, status }: UsersFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select.Root
        value={status ?? USER_STATUS_FILTER.ALL}
        onValueChange={(next) => {
          const option = Object.values(USER_STATUS_FILTER).find((candidate) => {
            return candidate === next;
          });

          return onChange(option === USER_STATUS_FILTER.ALL ? undefined : option);
        }}
      >
        <Select.Trigger aria-label="Status">
          <Select.Value />
        </Select.Trigger>

        <Select.Content>
          {Object.values(USER_STATUS_FILTER).map((option) => {
            return (
              <Select.Item key={option} value={option}>
                {USER_STATUS_FILTER_LABEL[option]}
              </Select.Item>
            );
          })}
        </Select.Content>
      </Select.Root>

      {status ? (
        <Button variant="outlined" onClick={onClear}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
};
