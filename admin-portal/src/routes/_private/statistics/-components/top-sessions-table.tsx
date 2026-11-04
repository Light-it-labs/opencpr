import { ChartCard } from "@/components/charts/chart-card";
import { DataTable } from "@/components/ui/data-table";
import type { TopSession } from "@/services/stats";
import { useTopSessionsTable } from "../-hooks/use-top-sessions-table";

type TopSessionsTableProps = {
  className?: string;
  isRefreshing?: boolean;
  sessions: TopSession[];
};

export const TopSessionsTable = ({ className, isRefreshing, sessions }: TopSessionsTableProps) => {
  const table = useTopSessionsTable({ data: sessions });

  return (
    <ChartCard
      className={className}
      description="Best session of the ten highest-scoring participants in this range"
      isRefreshing={isRefreshing}
      title="Top personal bests"
    >
      <DataTable emptyMessage="No sessions in this range" sortable={false} table={table} />
    </ChartCard>
  );
};
