import { ChartCard } from "@/components/charts/chart-card";
import type { PerformanceStats } from "@/services/stats";
import { formatPercent } from "@/utils/format-percent";
import { DistributionChart } from "./distribution-chart";
import { ShareReadout } from "./share-readout";

/** Label of the bucket that matches the 100–120 bpm guideline, as the API names it. */
const RATE_GUIDELINE_BUCKET = "100–120";

type RateDistributionChartProps = {
  isRefreshing?: boolean;
  rate: PerformanceStats["rate"];
};

export const RateDistributionChart = ({ isRefreshing, rate }: RateDistributionChartProps) => {
  return (
    <ChartCard
      action={<ShareReadout label="in range" value={formatPercent(rate.inRangeShare)} />}
      description="Sessions by average compression rate, leaving out sessions at 60 bpm or slower; the 100–120 bpm guideline bucket is highlighted"
      isRefreshing={isRefreshing}
      title="Compression rate"
    >
      <DistributionChart
        buckets={rate.buckets}
        caption="Sessions by average compression rate"
        guidelineLabel={RATE_GUIDELINE_BUCKET}
        unit="bpm"
      />
    </ChartCard>
  );
};
