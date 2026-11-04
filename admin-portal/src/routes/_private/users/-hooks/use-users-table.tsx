import { useMemo } from "react";
import { createColumnHelper, type SortingState } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";

import { RelativeTime } from "@/components/relative-time";
import { Badge } from "@/components/ui/badge";
import { type TableFeatureSet, useTable, type UseTableProps } from "@/components/ui/table";
import { type PortalUser, USER_ROLE_LABELS, USER_ROLES, type UserRole } from "@/services/users";
import { UserRowActions } from "../-components/user-row-actions";

const ALL_LOCATIONS_LABEL = "All locations";

const DEFAULT_SORTING: SortingState = [{ id: "invited", desc: true }];

type UseUsersTableProps = Omit<UseTableProps<PortalUser>, "columns"> & {
  canManage: boolean;
  currentUserId: string | undefined;
  locationNames: ReadonlyMap<string, string>;
  onChangeRole: (user: PortalUser, role: UserRole) => void;
  onEditLocations: (user: PortalUser) => void;
  onReinvite: (user: PortalUser) => void;
  onRevoke: (user: PortalUser) => void;
  reinvitingEmail: string | undefined;
};

export const useUsersTable = ({
  canManage,
  currentUserId,
  data = [],
  locationNames,
  onChangeRole,
  onEditLocations,
  onReinvite,
  onRevoke,
  reinvitingEmail,
  ...props
}: UseUsersTableProps) => {
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<TableFeatureSet, PortalUser>();

    return columnHelper.columns([
      columnHelper.accessor(
        (user) => {
          return user.name ?? undefined;
        },
        {
          id: "name",
          meta: { stringifiedHeader: "Name" },
          header: "Name",
          sortUndefined: "last",
          cell: ({ row }) => {
            const { lastLoginAt, name } = row.original;

            return (
              <div className="flex flex-col">
                <span>{name ?? "—"}</span>

                {lastLoginAt ? null : (
                  <span className="text-xs text-text-default-tertiary">Never signed in</span>
                )}
              </div>
            );
          },
        },
      ),
      columnHelper.accessor("email", {
        meta: { stringifiedHeader: "Email" },
        header: "Email",
      }),
      columnHelper.accessor("role", {
        meta: { stringifiedHeader: "Role" },
        header: "Role",
        cell: ({ row }) => {
          const { role } = row.original;

          return (
            <Badge size="sm" variant={role === USER_ROLES.admin ? "default" : "outline"}>
              {USER_ROLE_LABELS[role]}
            </Badge>
          );
        },
      }),
      columnHelper.accessor(
        (user) => {
          if (!user.locationIds.length) {
            return ALL_LOCATIONS_LABEL;
          }

          return user.locationIds
            .map((locationId) => {
              return locationNames.get(locationId) ?? locationId;
            })
            .join(", ");
        },
        {
          id: "locations",
          meta: { stringifiedHeader: "Locations" },
          header: "Locations",
          enableSorting: false,
        },
      ),
      columnHelper.accessor(
        (user) => {
          return user.deletedAt ? "Revoked" : "Active";
        },
        {
          id: "status",
          meta: { stringifiedHeader: "Status" },
          header: "Status",
          cell: ({ row }) => {
            return row.original.deletedAt ? (
              <Badge size="sm" variant="outline">
                Revoked
              </Badge>
            ) : (
              <Badge size="sm" variant="success">
                Active
              </Badge>
            );
          },
        },
      ),
      columnHelper.accessor(
        (user) => {
          return user.lastSeenAt ?? user.lastLoginAt ?? undefined;
        },
        {
          id: "lastSeen",
          meta: { stringifiedHeader: "Last seen" },
          header: "Last seen",
          sortUndefined: "last",
          cell: ({ getValue }) => {
            const lastSeen = getValue();

            if (!lastSeen) {
              return <span className="text-text-default-tertiary">—</span>;
            }

            return <RelativeTime date={lastSeen} />;
          },
        },
      ),
      columnHelper.accessor("createdAt", {
        id: "invited",
        meta: { stringifiedHeader: "Invited" },
        header: "Invited",
        cell: ({ row }) => {
          return format(parseISO(row.original.createdAt), "PP");
        },
      }),
      ...(canManage
        ? [
            columnHelper.display({
              id: "actions",
              enableHiding: false,
              enableSorting: false,
              cell: ({ row }) => {
                return (
                  <UserRowActions
                    currentUserId={currentUserId}
                    reinvitingEmail={reinvitingEmail}
                    user={row.original}
                    onChangeRole={onChangeRole}
                    onEditLocations={onEditLocations}
                    onReinvite={onReinvite}
                    onRevoke={onRevoke}
                  />
                );
              },
            }),
          ]
        : []),
    ]);
  }, [
    canManage,
    currentUserId,
    locationNames,
    onChangeRole,
    onEditLocations,
    onReinvite,
    onRevoke,
    reinvitingEmail,
  ]);

  return useTable({ columns, data, initialState: { sorting: DEFAULT_SORTING }, ...props });
};
