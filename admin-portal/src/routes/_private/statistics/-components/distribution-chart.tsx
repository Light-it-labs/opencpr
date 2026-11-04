import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartDataTable } from "@/components/charts/chart-data-table";
import {
  CHART_ACCENT_COLOR,
  CHART_AXIS_TICK,
  CHART_CURSOR,
  CHART_GRID_COLOR,
  CHART_SERIES_COLOR,
} from "@/components/charts/chart-theme";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import type { DistributionBucket } from "@/services/stats";
import { formatPercent } from "@/utils/format-percent";

const BAR_RADIUS = 4;
const MAX_BAR_SIZE = 48;

type DistributionChartProps = {
  buckets: DistributionBucket[];
  caption: string;
  guidelineLabel: string;
  unit: string;
};

export const DistributionChart = ({
  buckets,
  caption,
  guidelineLabel,
  unit,
}: DistributionChartProps) => {
  const total = buckets.reduce((sum, bucket) => {
    return sum + bucket.sessions;
  }, 0);

  const shareOf = (sessions: number) => {
    return formatPercent(total > 0 ? sessions / total : null);
  };

  return (
    <>
      <div aria-label={caption} className="h-48 w-full" role="img">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />

            <XAxis
              dataKey="label"
              stroke={CHART_GRID_COLOR}
              tick={CHART_AXIS_TICK}
              tickLine={false}
            />

            <YAxis
              allowDecimals={false}
              axisLine={false}
              tick={CHART_AXIS_TICK}
              tickLine={false}
              width={36}
            />

            <Tooltip
              content={({ active, label }) => {
                const bucket = buckets.find((item) => {
                  return item.label === label;
                });

                return active && bucket ? (
                  <ChartTooltip
                    rows={[
                      { label: "sessions", value: String(bucket.sessions) },
                      { label: "of sessions", value: shareOf(bucket.sessions) },
                    ]}
                    title={`${bucket.label} ${unit}`}
                  />
                ) : null;
              }}
              cursor={CHART_CURSOR}
            />

            <Bar
              dataKey="sessions"
              isAnimationActive={false}
              maxBarSize={MAX_BAR_SIZE}
              radius={[BAR_RADIUS, BAR_RADIUS, 0, 0]}
            >
              {buckets.map((bucket) => {
                return (
                  <Cell
                    key={bucket.label}
                    fill={bucket.label === guidelineLabel ? CHART_ACCENT_COLOR : CHART_SERIES_COLOR}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ChartDataTable
        caption={caption}
        headers={[`Range (${unit})`, "Sessions", "Share"]}
        rows={buckets.map((bucket) => {
          return {
            key: bucket.label,
            cells: [bucket.label, String(bucket.sessions), shareOf(bucket.sessions)],
          };
        })}
      />
    </>
  );
};
