import { format, setHours, startOfToday } from "date-fns";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/charts/chart-card";
import { ChartDataTable } from "@/components/charts/chart-data-table";
import {
  CHART_ACCENT_COLOR,
  CHART_AXIS_TICK,
  CHART_CURSOR,
  CHART_GRID_COLOR,
  CHART_SERIES_COLOR,
} from "@/components/charts/chart-theme";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import type { HourStat } from "@/services/stats";
import { formatScore, MAX_SCORE_PERCENT, toScorePercent } from "@/utils/score";

const BAR_RADIUS = 4;
const MAX_BAR_SIZE = 24;
const MIN_TICK_GAP = 16;
const LINE_WIDTH = 2;
const MARKER_RADIUS = 3;

const formatHour = (hour: number) => {
  return format(setHours(startOfToday(), hour), "HH:00");
};

type SessionsByHourChartProps = {
  byHour: HourStat[];
  className?: string;
  isRefreshing?: boolean;
};

export const SessionsByHourChart = ({
  byHour,
  className,
  isRefreshing,
}: SessionsByHourChartProps) => {
  const points = byHour.map((row) => {
    return {
      ...row,
      label: formatHour(row.hour),
      scorePercent: row.averageScore === null ? null : toScorePercent(row.averageScore),
    };
  });

  return (
    <ChartCard
      className={className}
      description="Sessions in each hour of the day, in each location's local time; the line is the mean score"
      isRefreshing={isRefreshing}
      title="Sessions by hour"
    >
      <div aria-label="Sessions by hour" className="h-64 w-full" role="img">
        <ResponsiveContainer height="100%" width="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />

            <XAxis
              dataKey="label"
              minTickGap={MIN_TICK_GAP}
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
              yAxisId="sessions"
            />

            <YAxis
              axisLine={false}
              domain={[0, MAX_SCORE_PERCENT]}
              orientation="right"
              tick={CHART_AXIS_TICK}
              tickFormatter={(tick: number) => {
                return `${tick}%`;
              }}
              tickLine={false}
              width={44}
              yAxisId="score"
            />

            <Tooltip
              content={({ active, label }) => {
                const point = points.find((item) => {
                  return item.label === label;
                });

                return active && point ? (
                  <ChartTooltip
                    rows={[
                      { label: "sessions", value: String(point.sessions) },
                      { label: "average score", value: formatScore(point.averageScore) },
                    ]}
                    title={point.label}
                  />
                ) : null;
              }}
              cursor={CHART_CURSOR}
            />

            <Bar
              dataKey="sessions"
              fill={CHART_SERIES_COLOR}
              isAnimationActive={false}
              maxBarSize={MAX_BAR_SIZE}
              radius={[BAR_RADIUS, BAR_RADIUS, 0, 0]}
              yAxisId="sessions"
            />

            <Line
              activeDot={{ r: MARKER_RADIUS + 1 }}
              connectNulls={false}
              dataKey="scorePercent"
              dot={{ r: MARKER_RADIUS }}
              isAnimationActive={false}
              stroke={CHART_ACCENT_COLOR}
              strokeWidth={LINE_WIDTH}
              type="monotone"
              yAxisId="score"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <ChartDataTable
        caption="Sessions by hour"
        headers={["Hour", "Sessions", "Average score"]}
        rows={points.map((point) => {
          return {
            key: point.label,
            cells: [point.label, String(point.sessions), formatScore(point.averageScore)],
          };
        })}
      />
    </ChartCard>
  );
};
