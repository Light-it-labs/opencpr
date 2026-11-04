import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/ui/icons";
import type { Location } from "@/services/locations";

type LocationRowActionsProps = {
  location: Location;
  onDelete: (location: Location) => void;
  onEdit: (location: Location) => void;
};

export const LocationRowActions = ({ location, onDelete, onEdit }: LocationRowActionsProps) => {
  return (
    <div className="flex justify-end">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button className="size-8" variant="plainText">
            <span className="sr-only">Open actions for {location.name}</span>

            <Icons.MoreHorizontal />
          </Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content align="end">
          <DropdownMenu.Item
            onClick={() => {
              return onEdit(location);
            }}
          >
            Edit
          </DropdownMenu.Item>

          <DropdownMenu.Item
            variant="destructive"
            onClick={() => {
              return onDelete(location);
            }}
          >
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
};
