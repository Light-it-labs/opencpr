import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { type Passkey, useDeletePasskey } from "@/services/passkeys";

type RemovePasskeyDialogProps = {
  onClose: () => void;
  passkey: Passkey | undefined;
};

export const RemovePasskeyDialog = ({ onClose, passkey }: RemovePasskeyDialogProps) => {
  const { isPending, mutate: removePasskey } = useDeletePasskey();

  const handleRemove = () => {
    if (!passkey) {
      return;
    }

    removePasskey(passkey.id, {
      onSuccess: () => {
        toast.success("Passkey removed");
        onClose();
      },
    });
  };

  return (
    <Dialog.Root
      open={Boolean(passkey)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <Dialog.Content isDismissible={!isPending}>
        {passkey ? (
          <>
            <Dialog.Header>
              <Dialog.Title>Remove {passkey.name}?</Dialog.Title>

              <Dialog.Description>
                You will not be able to sign in with this passkey again.
              </Dialog.Description>
            </Dialog.Header>

            <Dialog.Footer>
              <Dialog.Close disabled={isPending} asChild>
                <Button variant="outlined">Cancel</Button>
              </Dialog.Close>

              <Button isLoading={isPending} onClick={handleRemove}>
                Remove
              </Button>
            </Dialog.Footer>
          </>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
};
