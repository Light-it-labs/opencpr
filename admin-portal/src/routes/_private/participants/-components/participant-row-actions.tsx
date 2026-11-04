import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/ui/icons";
import type { Participant } from "@/services/participants";
import { getFullName } from "@/utils/full-name";

type ParticipantRowActionsProps = {
  onDelete: (participant: Participant) => void;
  participant: Participant;
};

export const ParticipantRowActions = ({ onDelete, participant }: ParticipantRowActionsProps) => {
  return (
    <div className="flex justify-end">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button className="size-8" variant="plainText">
            <span className="sr-only">Open actions for {getFullName(participant)}</span>

            <Icons.MoreHorizontal />
          </Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content align="end">
          <DropdownMenu.Item
            variant="destructive"
            onClick={() => {
              return onDelete(participant);
            }}
          >
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
};
