import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartDataTable } from "@/components/charts/chart-data-table";
import {
  CHART_AXIS_TICK,
  CHART_CURSOR,
  CHART_GRID_COLOR,
  CHART_SERIES_COLOR,
} from "@/components/charts/chart-theme";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import type { SessionSeries } from "./session-series";
import { formatBucketLabel, formatBucketTick, getBucketHeader } from "./session-series";

const BAR_RADIUS = 4;
const MIN_TICK_GAP = 24;
const MAX_BAR_SIZE = 24;

type SessionsOverTimeChartProps = {
  series: SessionSeries;
};

export const SessionsOverTimeChart = ({ series }: SessionsOverTimeChartProps) => {
  const title = `Sessions per ${series.bucket}`;

  return (
    <>
      <div aria-label={title} className="h-64 w-full" role="img">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart data={series.points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />

            <XAxis
              dataKey="date"
              minTickGap={MIN_TICK_GAP}
              stroke={CHART_GRID_COLOR}
              tick={CHART_AXIS_TICK}
              tickFormatter={(value: string) => {
                return formatBucketTick(value, series);
              }}
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
                const point = series.points.find((day) => {
                  return day.date === label;
                });

                return active && point ? (
                  <ChartTooltip
                    rows={[{ label: "sessions", value: String(point.count) }]}
                    title={formatBucketLabel(point.date, series.bucket)}
                  />
                ) : null;
              }}
              cursor={CHART_CURSOR}
            />

            <Bar
              dataKey="count"
              fill={CHART_SERIES_COLOR}
              isAnimationActive={false}
              maxBarSize={MAX_BAR_SIZE}
              radius={[BAR_RADIUS, BAR_RADIUS, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ChartDataTable
        caption={title}
        headers={[getBucketHeader(series.bucket), "Sessions"]}
        rows={series.points.map((day) => {
          return {
            key: day.date,
            cells: [formatBucketLabel(day.date, series.bucket), String(day.count)],
          };
        })}
      />
    </>
  );
};
