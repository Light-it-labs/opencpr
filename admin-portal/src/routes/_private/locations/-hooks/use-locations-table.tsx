import { useMemo } from "react";
import { createColumnHelper, type SortingState } from "@tanstack/react-table";
import { format, isSameDay } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { type TableFeatureSet, useTable, type UseTableProps } from "@/components/ui/table";
import { useNow } from "@/hooks/use-now";
import {
  getLocationStatus,
  type Location,
  LOCATION_DEFAULTS,
  type LocationStatus,
} from "@/services/locations";
import { parseCalendarDate } from "@/utils/calendar-date";
import { formatHours } from "@/utils/format-hours";
import { getTimezoneAbbreviation } from "@/utils/timezone-abbreviation";
import { LocationRowActions } from "../-components/location-row-actions";

const DEFAULT_SORTING: SortingState = [{ id: "dates", desc: true }];

const STATUS_BADGE: Record<
  LocationStatus,
  { label: string; variant: "outline" | "secondary" | "success" }
> = {
  active: { label: "Active", variant: "success" },
  closed: { label: "Closed", variant: "outline" },
  ended: { label: "Ended", variant: "secondary" },
  upcoming: { label: "Upcoming", variant: "outline" },
};

type UseLocationsTableProps = Omit<UseTableProps<Location>, "columns"> & {
  canManage: boolean;
  onDelete: (location: Location) => void;
  onEdit: (location: Location) => void;
};

export const useLocationsTable = ({
  canManage,
  data = [],
  onDelete,
  onEdit,
  ...props
}: UseLocationsTableProps) => {
  const now = useNow();

  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<TableFeatureSet, Location>();

    return columnHelper.columns([
      columnHelper.accessor("name", {
        meta: { stringifiedHeader: "Name" },
        header: "Name",
      }),
      columnHelper.accessor("city", {
        meta: { stringifiedHeader: "City" },
        header: "City",
      }),
      columnHelper.accessor("country", {
        meta: { stringifiedHeader: "Country" },
        header: "Country",
      }),
      columnHelper.accessor("address", {
        meta: { stringifiedHeader: "Address" },
        header: "Address",
      }),
      columnHelper.display({
        id: "hours",
        meta: { stringifiedHeader: "Hours" },
        header: "Hours",
        cell: ({ row }) => {
          const { closesAt, opensAt, timezone } = row.original;

          return (
            <div className="flex flex-col">
              <span>{formatHours({ closesAt, opensAt })}</span>

              {timezone === LOCATION_DEFAULTS.TIMEZONE ? null : (
                <span className="text-xs text-text-default-secondary">
                  {getTimezoneAbbreviation({ timezone }) ?? timezone}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("startDate", {
        id: "dates",
        meta: { stringifiedHeader: "Dates" },
        header: "Dates",
        cell: ({ row }) => {
          const { endDate, startDate } = row.original;
          const start = parseCalendarDate(startDate);
          const end = endDate ? parseCalendarDate(endDate) : undefined;

          if (end && isSameDay(start, end)) {
            return format(start, "PP");
          }

          return `${format(start, "PP")} → ${end ? format(end, "PP") : "ongoing"}`;
        },
      }),
      columnHelper.accessor(
        (location) => {
          return getLocationStatus(location, now);
        },
        {
          id: "status",
          meta: { stringifiedHeader: "Status" },
          header: "Status",
          cell: ({ getValue }) => {
            const { label, variant } = STATUS_BADGE[getValue()];

            return (
              <Badge size="sm" variant={variant}>
                {label}
              </Badge>
            );
          },
        },
      ),
      columnHelper.accessor("alertsEnabled", {
        meta: { stringifiedHeader: "Alerts" },
        header: "Alerts",
        cell: ({ getValue }) => {
          return (
            <Badge size="sm" variant={getValue() ? "success" : "secondary"}>
              {getValue() ? "On" : "Off"}
            </Badge>
          );
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
                  <LocationRowActions location={row.original} onDelete={onDelete} onEdit={onEdit} />
                );
              },
            }),
          ]
        : []),
    ]);
  }, [canManage, now, onDelete, onEdit]);

  return useTable({ columns, data, initialState: { sorting: DEFAULT_SORTING }, ...props });
};
