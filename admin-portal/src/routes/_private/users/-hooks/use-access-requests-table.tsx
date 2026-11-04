import { useMemo } from "react";
import { createColumnHelper, type SortingState } from "@tanstack/react-table";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { type TableFeatureSet, useTable, type UseTableProps } from "@/components/ui/table";
import type { AccessRequest } from "@/services/access-requests";

const DEFAULT_SORTING: SortingState = [{ id: "requested", desc: true }];

type UseAccessRequestsTableProps = Omit<UseTableProps<AccessRequest>, "columns"> & {
  canManage: boolean;
  onApprove: (request: AccessRequest) => void;
  onReject: (request: AccessRequest) => void;
};

export const useAccessRequestsTable = ({
  canManage,
  data = [],
  onApprove,
  onReject,
  ...props
}: UseAccessRequestsTableProps) => {
  const columns = useMemo(() => {
    const columnHelper = createColumnHelper<TableFeatureSet, AccessRequest>();

    return columnHelper.columns([
      columnHelper.accessor("email", {
        meta: { stringifiedHeader: "Email" },
        header: "Email",
      }),
      columnHelper.accessor("createdAt", {
        id: "requested",
        meta: { stringifiedHeader: "Requested" },
        header: "Requested",
        cell: ({ row }) => {
          return format(parseISO(row.original.createdAt), "PP p");
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
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outlined"
                      onClick={() => {
                        return onReject(row.original);
                      }}
                    >
                      Reject
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        return onApprove(row.original);
                      }}
                    >
                      Approve
                    </Button>
                  </div>
                );
              },
            }),
          ]
        : []),
    ]);
  }, [canManage, onApprove, onReject]);

  return useTable({ columns, data, initialState: { sorting: DEFAULT_SORTING }, ...props });
};
