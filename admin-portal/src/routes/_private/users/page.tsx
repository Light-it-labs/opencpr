import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Header } from "@/components/header";
import { LayoutWrapper } from "@/components/layout-wrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Icons } from "@/components/ui/icons";
import { queryClient } from "@/config/query-client";
import { meQuery, useCanManage, useMe } from "@/services/auth";
import { useAdminLocations } from "@/services/locations";
import {
  type PortalUser,
  useInviteUser,
  USER_ROLES,
  USER_STATUS_FILTER,
  useUpdateUser,
  useUsers,
  viewerLocationIds,
} from "@/services/users";
import { errorToast } from "@/utils/error-toast";
import { AccessRequestsSection } from "./-components/access-requests-section";
import { EditUserLocationsDialog } from "./-components/edit-user-locations-dialog";
import { InviteUserDialog } from "./-components/invite-user-dialog";
import { RevokeUserDialog } from "./-components/revoke-user-dialog";
import { UsersFilters } from "./-components/users-filters";
import { useUsersTable } from "./-hooks/use-users-table";

const UsersPage = () => {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [revokingUser, setRevokingUser] = useState<PortalUser>();
  const [editingLocationsUser, setEditingLocationsUser] = useState<PortalUser>();

  const { status } = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data: me } = useMe();
  const canManage = useCanManage();
  const { data, isError, isLoading, refetch } = useUsers();
  const { isPending: isReinviting, mutate: inviteUser, variables } = useInviteUser();
  const { mutate: updateUser } = useUpdateUser();
  const { data: locations } = useAdminLocations();

  const locationNames = useMemo(() => {
    return new Map(
      (locations ?? []).map((location) => {
        return [location.id, location.name];
      }),
    );
  }, [locations]);

  const filteredUsers = useMemo(() => {
    return (data ?? []).filter((user) => {
      return !status || Boolean(user.deletedAt) === (status === USER_STATUS_FILTER.REVOKED);
    });
  }, [data, status]);

  const table = useUsersTable({
    canManage,
    currentUserId: me?.id,
    data: filteredUsers,
    locationNames,
    onChangeRole: (user, role) => {
      updateUser(
        { id: user.id, payload: { role } },
        {
          onSuccess: () => {
            toast.success("Role updated");
          },
        },
      );
    },
    onEditLocations: setEditingLocationsUser,
    onReinvite: (user) => {
      inviteUser(
        {
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          locationIds: viewerLocationIds(user),
        },
        {
          onSuccess: () => {
            toast.success(`${user.email} re-invited`);
          },
          onError: errorToast,
        },
      );
    },
    onRevoke: setRevokingUser,
    reinvitingEmail: isReinviting ? variables?.email : undefined,
  });

  return (
    <LayoutWrapper>
      <InviteUserDialog
        open={isInviteOpen}
        onClose={() => {
          return setIsInviteOpen(false);
        }}
      />

      <RevokeUserDialog
        user={revokingUser}
        onClose={() => {
          return setRevokingUser(undefined);
        }}
      />

      <EditUserLocationsDialog
        user={editingLocationsUser}
        onClose={() => {
          return setEditingLocationsUser(undefined);
        }}
      />

      <Header.Root>
        <Breadcrumbs pages={[{ name: "Users" }]} />

        <Header.Content>
          <Header.Title>Users</Header.Title>

          {canManage ? (
            <Button
              onClick={() => {
                return setIsInviteOpen(true);
              }}
            >
              <Icons.Plus />
              Invite user
            </Button>
          ) : null}
        </Header.Content>
      </Header.Root>

      <AccessRequestsSection />

      <UsersFilters
        status={status}
        onChange={(next) => {
          return navigate({
            search: (previous) => {
              return { ...previous, status: next };
            },
          });
        }}
        onClear={() => {
          table.resetSorting();

          return navigate({
            search: (previous) => {
              return { ...previous, status: undefined };
            },
          });
        }}
      />

      {isError ? (
        <Card.Root>
          <Card.Content className="flex items-center justify-between gap-4">
            <p>Could not load users.</p>

            <Button
              variant="outlined"
              onClick={() => {
                return refetch();
              }}
            >
              Retry
            </Button>
          </Card.Content>
        </Card.Root>
      ) : (
        <DataTable
          emptyMessage="No users yet"
          hasActiveFilters={Boolean(status)}
          isLoading={isLoading}
          table={table}
        />
      )}
    </LayoutWrapper>
  );
};

export const Route = createFileRoute("/_private/users/")({
  validateSearch: z.object({
    status: z
      .enum([USER_STATUS_FILTER.ACTIVE, USER_STATUS_FILTER.REVOKED])
      .optional()
      .catch(undefined),
  }),
  component: UsersPage,
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData(meQuery);

    if (user?.role !== USER_ROLES.admin) {
      throw redirect({ to: "/" });
    }
  },
});
