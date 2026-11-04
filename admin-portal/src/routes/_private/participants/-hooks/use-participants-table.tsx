import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";

import { RelativeTime } from "@/components/relative-time";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type TableFeatureSet, useTable, type UseTableProps } from "@/components/ui/table";
import { SCORE_BAND_BADGE_VARIANT } from "@/constants/score-band";
import type { Participant } from "@/services/participants";
import { getFullName } from "@/utils/full-name";
import { formatScore } from "@/utils/score";
import { getScoreBand } from "@/utils/score-band";
import { ParticipantLocations } from "../-components/participant-locations";
import { ParticipantRowActions } from "../-components/participant-row-actions";

type UseParticipantsTableProps = Omit<UseTableProps<Participant>, "columns"> & {
  canManage: boolean;
  onDelete: (participant: Participant) => void;
};

export const useParticipantsTable = ({
  canManage,
  data = [],
  onDelete,
  ...props
}: UseParticipantsTableProps) => {
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<TableFeatureSet, Participant>();

    return columnHelper.columns([
      columnHelper.accessor("lastName", {
        meta: { stringifiedHeader: "Name" },
        header: "Name",
        cell: ({ row }) => {
          return (
            <Button className="h-auto p-0" variant="plainText" asChild>
              <Link search={{ page: 1, searchText: row.original.email }} to="/sessions">
                {getFullName(row.original)}
              </Link>
            </Button>
          );
        },
      }),
      columnHelper.accessor("email", {
        meta: { stringifiedHeader: "Email" },
        header: "Email",
      }),
      columnHelper.accessor("sessionsCount", {
        meta: { stringifiedHeader: "Sessions" },
        header: "Sessions",
      }),
      columnHelper.accessor("bestScore", {
        meta: { stringifiedHeader: "Best score" },
        header: "Best score",
        cell: ({ row }) => {
          const { bestScore } = row.original;

          if (bestScore === null) {
            return "—";
          }

          return (
            <Badge size="sm" variant={SCORE_BAND_BADGE_VARIANT[getScoreBand(bestScore)]}>
              {formatScore(bestScore)}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("lastPlayedAt", {
        meta: { stringifiedHeader: "Last played" },
        header: "Last played",
        cell: ({ row }) => {
          const { lastPlayedAt } = row.original;

          if (!lastPlayedAt) {
            return <span className="text-text-default-tertiary">Never</span>;
          }

          return <RelativeTime date={lastPlayedAt} />;
        },
      }),
      columnHelper.display({
        id: "locations",
        meta: { stringifiedHeader: "Locations" },
        header: "Locations",
        cell: ({ row }) => {
          return <ParticipantLocations locations={row.original.locations} />;
        },
      }),
      ...(canManage
        ? [
            columnHelper.display({
              id: "actions",
              enableHiding: false,
              enableSorting: false,
              cell: ({ row }) => {
                return <ParticipantRowActions participant={row.original} onDelete={onDelete} />;
              },
            }),
          ]
        : []),
    ]);
  }, [canManage, onDelete]);

  return useTable({ columns, data, ...props });
};
