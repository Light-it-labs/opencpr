import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { type Participant, useDeleteParticipant } from "@/services/participants";
import { getFullName } from "@/utils/full-name";

type DeleteParticipantDialogProps = {
  onClose: () => void;
  participant: Participant | undefined;
};

export const DeleteParticipantDialog = ({ onClose, participant }: DeleteParticipantDialogProps) => {
  const { isPending, mutate: deleteParticipant } = useDeleteParticipant();

  const handleDelete = () => {
    if (!participant) {
      return;
    }

    deleteParticipant(participant.id, {
      onSuccess: () => {
        toast.success("Participant deleted");
        onClose();
      },
    });
  };

  return (
    <Dialog.Root
      open={Boolean(participant)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <Dialog.Content isDismissible={!isPending}>
        {participant ? (
          <>
            <Dialog.Header>
              <Dialog.Title>Delete participant</Dialog.Title>

              <Dialog.Description>
                {getFullName(participant)} and their sessions and compressions will be permanently
                removed. This cannot be undone.
              </Dialog.Description>
            </Dialog.Header>

            <Dialog.Footer>
              <Dialog.Close disabled={isPending} asChild>
                <Button variant="outlined">Cancel</Button>
              </Dialog.Close>

              <Button isLoading={isPending} variant="destructive" onClick={handleDelete}>
                Delete
              </Button>
            </Dialog.Footer>
          </>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
};
