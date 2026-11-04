import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type TableFeatureSet, useTable, type UseTableProps } from "@/components/ui/table";
import { SCORE_BAND_BADGE_VARIANT } from "@/constants/score-band";
import type { TopSession } from "@/services/stats";
import { formatScore } from "@/utils/score";
import { getScoreBand } from "@/utils/score-band";

export const useTopSessionsTable = ({
  data = [],
  ...props
}: Omit<UseTableProps<TopSession>, "columns">) => {
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<TableFeatureSet, TopSession>();

    return columnHelper.columns([
      columnHelper.display({
        id: "rank",
        meta: { stringifiedHeader: "Rank" },
        header: "#",
        cell: ({ row }) => {
          return row.index + 1;
        },
      }),
      columnHelper.accessor("participantName", {
        meta: { stringifiedHeader: "Participant" },
        header: "Participant",
        cell: ({ row }) => {
          const { participantName } = row.original;

          return participantName ?? <span className="text-text-default-tertiary">Anonymous</span>;
        },
      }),
      columnHelper.accessor("locationName", {
        meta: { stringifiedHeader: "Location" },
        header: "Location",
      }),
      columnHelper.accessor("createdAt", {
        meta: { stringifiedHeader: "When" },
        header: "When",
        cell: ({ row }) => {
          const { createdAt, sessionId } = row.original;

          return (
            <Button className="h-auto p-0" variant="plainText" asChild>
              <Link params={{ sessionId }} to="/sessions/$sessionId">
                {format(parseISO(createdAt), "PP p")}
              </Link>
            </Button>
          );
        },
      }),
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
    ]);
  }, []);

  return useTable({ columns, data, ...props });
};
