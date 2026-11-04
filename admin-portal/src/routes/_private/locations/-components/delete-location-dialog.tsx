import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { type Location, useDeleteLocation } from "@/services/locations";

type DeleteLocationDialogProps = {
  location: Location | undefined;
  onClose: () => void;
};

export const DeleteLocationDialog = ({ location, onClose }: DeleteLocationDialogProps) => {
  const { isPending, mutate: deleteLocation } = useDeleteLocation();

  const handleDelete = () => {
    if (!location) {
      return;
    }

    deleteLocation(location.id, {
      onSuccess: () => {
        toast.success("Location deleted");
        onClose();
      },
    });
  };

  return (
    <Dialog.Root
      open={Boolean(location)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <Dialog.Content isDismissible={!isPending}>
        {location ? (
          <>
            <Dialog.Header>
              <Dialog.Title>Delete location</Dialog.Title>

              <Dialog.Description>
                {location.name} will be removed from the portal and kiosks will stop reporting for
                it.
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
