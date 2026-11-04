import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { type AccessRequest, useRejectAccessRequest } from "@/services/access-requests";

type RejectAccessRequestDialogProps = {
  onClose: () => void;
  request: AccessRequest | undefined;
};

export const RejectAccessRequestDialog = ({ onClose, request }: RejectAccessRequestDialogProps) => {
  const { isPending, mutate: rejectAccessRequest } = useRejectAccessRequest();

  const handleReject = () => {
    if (!request) {
      return;
    }

    rejectAccessRequest(request.id, {
      onSuccess: () => {
        toast.success(`Access request from ${request.email} rejected`);
        onClose();
      },
    });
  };

  return (
    <Dialog.Root
      open={Boolean(request)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <Dialog.Content isDismissible={!isPending}>
        {request ? (
          <>
            <Dialog.Header>
              <Dialog.Title>Reject {request.email}?</Dialog.Title>

              <Dialog.Description>
                They will not get an account, and new sign-in requests from this email will not show
                up here again. You can still invite them later.
              </Dialog.Description>
            </Dialog.Header>

            <Dialog.Footer>
              <Dialog.Close disabled={isPending} asChild>
                <Button variant="outlined">Cancel</Button>
              </Dialog.Close>

              <Button isLoading={isPending} onClick={handleReject}>
                Reject
              </Button>
            </Dialog.Footer>
          </>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
};
