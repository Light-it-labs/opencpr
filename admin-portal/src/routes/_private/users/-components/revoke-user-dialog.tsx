import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { type PortalUser, useRevokeUser } from "@/services/users";

type RevokeUserDialogProps = {
  onClose: () => void;
  user: PortalUser | undefined;
};

export const RevokeUserDialog = ({ onClose, user }: RevokeUserDialogProps) => {
  const { isPending, mutate: revokeUser } = useRevokeUser();

  const handleRevoke = () => {
    if (!user) {
      return;
    }

    revokeUser(user.id, {
      onSuccess: () => {
        toast.success(`${user.email} revoked`);
        onClose();
      },
    });
  };

  return (
    <Dialog.Root
      open={Boolean(user)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <Dialog.Content isDismissible={!isPending}>
        {user ? (
          <>
            <Dialog.Header>
              <Dialog.Title>Revoke {user.email}?</Dialog.Title>

              <Dialog.Description>
                They will be signed out and will no longer be able to sign in. You can re-invite
                them later.
              </Dialog.Description>
            </Dialog.Header>

            <Dialog.Footer>
              <Dialog.Close disabled={isPending} asChild>
                <Button variant="outlined">Cancel</Button>
              </Dialog.Close>

              <Button isLoading={isPending} onClick={handleRevoke}>
                Revoke
              </Button>
            </Dialog.Footer>
          </>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
};
