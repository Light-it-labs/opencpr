import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type TableFeatureSet, useTable, type UseTableProps } from "@/components/ui/table";
import { SCORE_BAND_BADGE_VARIANT } from "@/constants/score-band";
import type { Session } from "@/services/sessions";
import { getFullName } from "@/utils/full-name";
import { formatScore } from "@/utils/score";
import { getScoreBand } from "@/utils/score-band";

export const useSessionsTable = ({
  data = [],
  ...props
}: Omit<UseTableProps<Session>, "columns">) => {
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<TableFeatureSet, Session>();

    return columnHelper.columns([
      columnHelper.accessor("createdAt", {
        meta: { stringifiedHeader: "When" },
        header: "When",
        cell: ({ row }) => {
          const { createdAt, id } = row.original;

          return (
            <Button className="h-auto p-0" variant="plainText" asChild>
              <Link params={{ sessionId: id }} to="/sessions/$sessionId">
                {format(parseISO(createdAt), "PP p")}
              </Link>
            </Button>
          );
        },
      }),
      columnHelper.accessor(
        (session) => {
          return session.location?.name;
        },
        {
          id: "location",
          meta: { stringifiedHeader: "Location" },
          header: "Location",
          cell: ({ row }) => {
            const { location } = row.original;

            return location ? (
              location.name
            ) : (
              <span className="text-text-default-tertiary">Unknown</span>
            );
          },
        },
      ),
      columnHelper.accessor(
        (session) => {
          return session.participant ? getFullName(session.participant) : undefined;
        },
        {
          id: "participant",
          meta: { stringifiedHeader: "Participant" },
          header: "Participant",
          cell: ({ row }) => {
            const { participant } = row.original;

            if (!participant) {
              return <span className="text-text-default-tertiary">Anonymous</span>;
            }

            return (
              <div className="flex flex-col">
                <span>{getFullName(participant)}</span>
                <span className="text-xs text-text-default-secondary">{participant.email}</span>
              </div>
            );
          },
        },
      ),
      columnHelper.accessor("score", {
        meta: { stringifiedHeader: "Score" },
        header: "Score",
        cell: ({ row }) => {
          const { score } = row.original;

          return (
            <Badge size="sm" variant={SCORE_BAND_BADGE_VARIANT[getScoreBand(score)]}>
              {formatScore(score)}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("totalCompressions", {
        meta: { stringifiedHeader: "Compressions" },
        header: "Compressions",
      }),
      columnHelper.accessor("averageCompressionEndDepthMm", {
        meta: { stringifiedHeader: "Avg depth" },
        header: "Avg depth",
        cell: ({ row }) => {
          const { averageCompressionEndDepthMm } = row.original;

          return averageCompressionEndDepthMm === null
            ? "—"
            : `${averageCompressionEndDepthMm.toFixed(1)} mm`;
        },
      }),
      columnHelper.accessor("averageBpm", {
        meta: { stringifiedHeader: "Avg BPM" },
        header: "Avg BPM",
        cell: ({ row }) => {
          const { averageBpm } = row.original;

          return averageBpm === null ? "—" : Math.round(averageBpm);
        },
      }),
    ]);
  }, []);

  return useTable({ columns, data, ...props });
};
