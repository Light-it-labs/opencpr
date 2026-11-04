import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/ui/icons";
import { type PortalUser, USER_ROLES, type UserRole } from "@/services/users";

type UserRowActionsProps = {
  currentUserId: string | undefined;
  onChangeRole: (user: PortalUser, role: UserRole) => void;
  onEditLocations: (user: PortalUser) => void;
  onReinvite: (user: PortalUser) => void;
  onRevoke: (user: PortalUser) => void;
  reinvitingEmail: string | undefined;
  user: PortalUser;
};

export const UserRowActions = ({
  currentUserId,
  onChangeRole,
  onEditLocations,
  onReinvite,
  onRevoke,
  reinvitingEmail,
  user,
}: UserRowActionsProps) => {
  const isRevoked = Boolean(user.deletedAt);
  const isSelf = user.id === currentUserId;
  const isAdmin = user.role === USER_ROLES.admin;

  if (!isRevoked && isSelf) {
    return null;
  }

  return (
    <div className="flex justify-end">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button className="size-8" variant="plainText">
            <span className="sr-only">Open actions for {user.email}</span>

            <Icons.MoreHorizontal />
          </Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content align="end">
          {isRevoked ? (
            <DropdownMenu.Item
              disabled={Boolean(reinvitingEmail)}
              onClick={() => {
                return onReinvite(user);
              }}
            >
              {reinvitingEmail === user.email ? "Re-inviting…" : "Re-invite"}
            </DropdownMenu.Item>
          ) : (
            <>
              <DropdownMenu.Item
                onClick={() => {
                  return onChangeRole(user, isAdmin ? USER_ROLES.viewer : USER_ROLES.admin);
                }}
              >
                {isAdmin ? "Make viewer" : "Make admin"}
              </DropdownMenu.Item>

              {isAdmin ? null : (
                <DropdownMenu.Item
                  onClick={() => {
                    return onEditLocations(user);
                  }}
                >
                  Edit locations
                </DropdownMenu.Item>
              )}

              <DropdownMenu.Item
                onClick={() => {
                  return onRevoke(user);
                }}
              >
                Revoke
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
};
