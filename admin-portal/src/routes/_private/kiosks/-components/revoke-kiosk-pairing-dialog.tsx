import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { type Kiosk, useRevokeKioskPairing } from "@/services/kiosks";

type RevokeKioskPairingDialogProps = {
  kiosk: Kiosk | undefined;
  onClose: () => void;
};

export const RevokeKioskPairingDialog = ({ kiosk, onClose }: RevokeKioskPairingDialogProps) => {
  const { isPending, mutate: revokePairing } = useRevokeKioskPairing();

  const handleRevoke = () => {
    if (!kiosk) {
      return;
    }

    revokePairing(kiosk.kioskId, {
      onSuccess: () => {
        toast.success("Kiosk pairing revoked");
        onClose();
      },
    });
  };

  return (
    <Dialog.Root
      open={Boolean(kiosk)}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <Dialog.Content isDismissible={!isPending}>
        {kiosk ? (
          <>
            <Dialog.Header>
              <Dialog.Title>Revoke this kiosk&apos;s pairing?</Dialog.Title>

              <Dialog.Description>
                Kiosk <span className="font-mono">{kiosk.kioskId}</span> stops reporting and saving
                runs, and its setup screen asks for a new pairing code. Runs it has not sent yet
                stay on the kiosk until it is paired again.
              </Dialog.Description>
            </Dialog.Header>

            <Dialog.Footer>
              <Dialog.Close disabled={isPending} asChild>
                <Button variant="outlined">Cancel</Button>
              </Dialog.Close>

              <Button isLoading={isPending} onClick={handleRevoke}>
                Revoke pairing
              </Button>
            </Dialog.Footer>
          </>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
};
