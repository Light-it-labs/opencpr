import { useMemo } from "react";
import { createColumnHelper, type SortingState } from "@tanstack/react-table";

import { RelativeTime } from "@/components/relative-time";
import { Badge } from "@/components/ui/badge";
import { type TableFeatureSet, useTable, type UseTableProps } from "@/components/ui/table";
import { type Kiosk, SERIAL_STATUS_LABEL } from "@/services/kiosks";
import { KioskRowActions } from "../-components/kiosk-row-actions";

const SHORT_BUILD_LENGTH = 7;

const DEFAULT_SORTING: SortingState = [{ id: "lastSeen", desc: true }];

type UseKiosksTableProps = Omit<UseTableProps<Kiosk>, "columns"> & {
  locationNames: Map<string, string>;
  onRevokePairing: (kiosk: Kiosk) => void;
};

export const useKiosksTable = ({
  data = [],
  locationNames,
  onRevokePairing,
  ...props
}: UseKiosksTableProps) => {
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<TableFeatureSet, Kiosk>();

    return columnHelper.columns([
      columnHelper.accessor(
        (kiosk) => {
          return kiosk.locationId
            ? (locationNames.get(kiosk.locationId) ?? kiosk.locationId)
            : undefined;
        },
        {
          id: "location",
          meta: { stringifiedHeader: "Location" },
          header: "Location",
          sortUndefined: "last",
          cell: ({ row }) => {
            const { locationId } = row.original;

            if (!locationId) {
              return <span className="text-text-default-tertiary">Unassigned</span>;
            }

            const name = locationNames.get(locationId);

            return name ?? <span className="text-text-default-tertiary">{locationId}</span>;
          },
        },
      ),
      columnHelper.accessor(
        (kiosk) => {
          return kiosk.pairedAt ?? undefined;
        },
        {
          id: "pairing",
          meta: { stringifiedHeader: "Pairing" },
          header: "Pairing",
          sortUndefined: "last",
          cell: ({ row }) => {
            const { pairedAt } = row.original;

            if (!pairedAt) {
              return (
                <Badge size="sm" variant="warning">
                  Not paired
                </Badge>
              );
            }

            return (
              <span className="flex items-center gap-2">
                <Badge size="sm" variant="outline">
                  Paired
                </Badge>

                <RelativeTime date={pairedAt} />
              </span>
            );
          },
        },
      ),
      columnHelper.accessor("online", {
        id: "status",
        meta: { stringifiedHeader: "Status" },
        header: "Status",
        cell: ({ row }) => {
          return row.original.online ? (
            <Badge size="sm" variant="success">
              Online
            </Badge>
          ) : (
            <Badge size="sm" variant="destructive">
              Offline
            </Badge>
          );
        },
      }),
      columnHelper.accessor(
        (kiosk) => {
          return kiosk.serialStatus ?? undefined;
        },
        {
          id: "sensor",
          meta: { stringifiedHeader: "Sensor" },
          header: "Sensor",
          sortUndefined: "last",
          cell: ({ row }) => {
            const { serialStale, serialStatus } = row.original;

            if (!serialStatus) {
              return <span className="text-text-default-tertiary">Never</span>;
            }

            return (
              <span className="flex items-center gap-2">
                {SERIAL_STATUS_LABEL[serialStatus] ?? serialStatus}

                {serialStale ? (
                  <Badge size="xs" variant="warning">
                    Stale
                  </Badge>
                ) : null}
              </span>
            );
          },
        },
      ),
      columnHelper.accessor(
        (kiosk) => {
          return kiosk.lastSeenAt ?? undefined;
        },
        {
          id: "lastSeen",
          meta: { stringifiedHeader: "Last seen" },
          header: "Last seen",
          sortUndefined: "last",
          cell: ({ row }) => {
            const { lastSeenAt } = row.original;

            if (!lastSeenAt) {
              return <span className="text-text-default-tertiary">Never</span>;
            }

            return <RelativeTime date={lastSeenAt} />;
          },
        },
      ),
      columnHelper.accessor(
        (kiosk) => {
          return kiosk.lastVisitAt ?? undefined;
        },
        {
          id: "lastVisit",
          meta: { stringifiedHeader: "Last visit" },
          header: "Last visit",
          sortUndefined: "last",
          cell: ({ row }) => {
            const { lastVisitAt } = row.original;

            return lastVisitAt ? <RelativeTime date={lastVisitAt} /> : "—";
          },
        },
      ),
      columnHelper.accessor(
        (kiosk) => {
          return kiosk.baselineMm ?? undefined;
        },
        {
          id: "baseline",
          meta: { stringifiedHeader: "Baseline" },
          header: "Baseline",
          sortUndefined: "last",
          cell: ({ row }) => {
            const { baselineMm } = row.original;

            return baselineMm === null ? "—" : `${baselineMm.toFixed(1)} mm`;
          },
        },
      ),
      columnHelper.accessor(
        (kiosk) => {
          return kiosk.buildId ?? undefined;
        },
        {
          id: "build",
          meta: { stringifiedHeader: "Build" },
          header: "Build",
          sortUndefined: "last",
          cell: ({ row }) => {
            const { buildId } = row.original;

            return buildId ? (
              <span className="font-mono text-xs">{buildId.slice(0, SHORT_BUILD_LENGTH)}</span>
            ) : (
              "—"
            );
          },
        },
      ),
      columnHelper.accessor("completions", {
        meta: { stringifiedHeader: "Completions" },
        header: "Completions",
      }),
      columnHelper.display({
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          return <KioskRowActions kiosk={row.original} onRevokePairing={onRevokePairing} />;
        },
      }),
    ]);
  }, [locationNames, onRevokePairing]);

  return useTable({ columns, data, initialState: { sorting: DEFAULT_SORTING }, ...props });
};
