import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartDataTable } from "@/components/charts/chart-data-table";
import {
  CHART_AXIS_TICK,
  CHART_GRID_COLOR,
  CHART_SERIES_COLOR,
} from "@/components/charts/chart-theme";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { formatScore, MAX_SCORE_PERCENT, toScorePercent } from "@/utils/score";
import type { SessionSeries } from "./session-series";
import { formatBucketLabel, formatBucketTick, getBucketHeader } from "./session-series";

const MIN_TICK_GAP = 24;
const LINE_WIDTH = 2;
const MARKER_RADIUS = 4;

type AverageScoreChartProps = {
  series: SessionSeries;
};

export const AverageScoreChart = ({ series }: AverageScoreChartProps) => {
  const title = `Average score per ${series.bucket}`;
  const points = series.points.map((day) => {
    return {
      ...day,
      scorePercent: day.averageScore === null ? null : toScorePercent(day.averageScore),
    };
  });

  return (
    <>
      <div aria-label={title} className="h-48 w-full" role="img">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
              axisLine={false}
              domain={[0, MAX_SCORE_PERCENT]}
              tick={CHART_AXIS_TICK}
              tickFormatter={(tick: number) => {
                return `${tick}%`;
              }}
              tickLine={false}
              width={44}
            />

            <Tooltip
              content={({ active, label }) => {
                const point = series.points.find((day) => {
                  return day.date === label;
                });

                return active && point ? (
                  <ChartTooltip
                    rows={[
                      {
                        label: "average score",
                        value: formatScore(point.averageScore),
                      },
                      { label: "sessions", value: String(point.count) },
                    ]}
                    title={formatBucketLabel(point.date, series.bucket)}
                  />
                ) : null;
              }}
            />

            <Line
              activeDot={{ r: MARKER_RADIUS }}
              dataKey="scorePercent"
              dot={false}
              isAnimationActive={false}
              stroke={CHART_SERIES_COLOR}
              strokeWidth={LINE_WIDTH}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ChartDataTable
        caption={title}
        headers={[getBucketHeader(series.bucket), "Average score", "Sessions"]}
        rows={series.points.map((day) => {
          return {
            key: day.date,
            cells: [
              formatBucketLabel(day.date, series.bucket),
              formatScore(day.averageScore),
              String(day.count),
            ],
          };
        })}
      />
    </>
  );
};
