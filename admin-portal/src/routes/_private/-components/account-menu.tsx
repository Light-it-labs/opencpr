import { Link, useNavigate } from "@tanstack/react-router";
import { tv } from "tailwind-variants";

import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout, useMe } from "@/services/auth";
import { USER_ROLE_LABELS } from "@/services/users";

const accountMenuVariants = tv({
  slots: {
    trigger:
      "px-2 text-text-brand-on-brand hover:bg-background-brand-strong-hover hover:text-text-brand-on-brand active:text-text-brand-on-brand",
    avatar:
      "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background-brand-secondary text-sm font-medium text-text-brand-on-brand-secondary",
    userName: "hidden text-sm sm:inline",
    email: "flex max-w-64 flex-col text-text-default-secondary",
    role: "text-xs font-normal text-text-default-tertiary",
    skeleton: "flex items-center gap-2 px-2",
    skeletonAvatar: "size-8 rounded-full bg-background-brand-secondary/40",
    skeletonName: "hidden h-4 w-24 bg-background-brand-secondary/40 sm:block",
  },
});

const { avatar, email, role, skeleton, skeletonAvatar, skeletonName, trigger, userName } =
  accountMenuVariants();

type AccountMenuProps = {
  /** Keeps the placeholder while the surrounding shell is still pending. */
  isLoading?: boolean;
};

export const AccountMenu = ({ isLoading = false }: AccountMenuProps) => {
  const navigate = useNavigate();
  const { data: user, isPending } = useMe();
  const { mutate: logout } = useLogout();

  if (isLoading || isPending) {
    return (
      <div aria-busy="true" aria-label="Loading account" className={skeleton()} role="status">
        <Skeleton className={skeletonAvatar()} />

        <Skeleton className={skeletonName()} />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displayName = user.name ?? user.email;

  const handleLogout = () => {
    logout(undefined, {
      onSettled: async () => {
        await navigate({ to: "/login" });
      },
    });
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button aria-label="Account menu" className={trigger()} variant="plainText">
          <span className={avatar()}>{displayName.slice(0, 1).toUpperCase()}</span>

          <span className={userName()}>{displayName}</span>

          <Icons.ChevronDown />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="end">
        <DropdownMenu.Label className={email()}>
          <span className="truncate">{user.email}</span>

          <span className={role()}>{USER_ROLE_LABELS[user.role]}</span>
        </DropdownMenu.Label>

        <DropdownMenu.Separator />

        <DropdownMenu.Item asChild>
          <Link to="/security">
            <Icons.ShieldCheck />

            <span>Security</span>
          </Link>
        </DropdownMenu.Item>

        <DropdownMenu.Separator />

        <DropdownMenu.Item onClick={handleLogout}>
          <Icons.LogOut />

          <span>Log out</span>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};
