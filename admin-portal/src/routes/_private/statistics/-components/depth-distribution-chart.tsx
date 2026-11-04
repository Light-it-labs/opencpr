import { ChartCard } from "@/components/charts/chart-card";
import type { PerformanceStats } from "@/services/stats";
import { formatPercent } from "@/utils/format-percent";
import { DistributionChart } from "./distribution-chart";
import { ShareReadout } from "./share-readout";

/** Label of the bucket that matches the 50–60 mm guideline, as the API names it. */
const DEPTH_GUIDELINE_BUCKET = "50–60";

type DepthDistributionChartProps = {
  depth: PerformanceStats["depth"];
  isRefreshing?: boolean;
};

export const DepthDistributionChart = ({ depth, isRefreshing }: DepthDistributionChartProps) => {
  return (
    <ChartCard
      action={<ShareReadout label="in range" value={formatPercent(depth.inRangeShare)} />}
      description="Sessions by average compression depth; the 50–60 mm guideline bucket is highlighted"
      isRefreshing={isRefreshing}
      title="Compression depth"
    >
      <DistributionChart
        buckets={depth.buckets}
        caption="Sessions by average compression depth"
        guidelineLabel={DEPTH_GUIDELINE_BUCKET}
        unit="mm"
      />
    </ChartCard>
  );
};
