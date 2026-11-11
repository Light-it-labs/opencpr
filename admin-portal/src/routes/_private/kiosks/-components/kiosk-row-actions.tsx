import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/ui/icons";
import type { Kiosk } from "@/services/kiosks";

type KioskRowActionsProps = {
  kiosk: Kiosk;
  onRevokePairing: (kiosk: Kiosk) => void;
};

export const KioskRowActions = ({ kiosk, onRevokePairing }: KioskRowActionsProps) => {
  if (!kiosk.pairedAt) {
    return null;
  }

  return (
    <div className="flex justify-end">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button className="size-8" variant="plainText">
            <span className="sr-only">Open actions for kiosk {kiosk.kioskId}</span>

            <Icons.MoreHorizontal />
          </Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content align="end">
          <DropdownMenu.Item
            variant="destructive"
            onClick={() => {
              return onRevokePairing(kiosk);
            }}
          >
            Revoke pairing
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
};
