import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
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
import type { Compression } from "@/services/sessions";

const AHA_MINIMUM_DEPTH_MM = 50;
const MIN_AXIS_MAX_MM = 70;
const MS_PER_SECOND = 1000;

type CompressionsChartProps = {
  compressions: Compression[];
};

export const CompressionsChart = ({ compressions }: CompressionsChartProps) => {
  const hasTimestamps = compressions.every((compression) => {
    return compression.timestampMs !== null;
  });

  const points = compressions.map((compression, index) => {
    return {
      id: compression.id,
      x: hasTimestamps
        ? Number(((compression.timestampMs ?? 0) / MS_PER_SECOND).toFixed(2))
        : index + 1,
      depth: compression.endDepthMm,
    };
  });

  const maxDepth = Math.max(
    MIN_AXIS_MAX_MM,
    ...points.map((point) => {
      return point.depth;
    }),
  );
  const xLabel = hasTimestamps ? "Time (s)" : "Compression #";

  return (
    <>
      <div
        aria-label={`Compression end depth in millimeters over ${hasTimestamps ? "time" : "compression order"}`}
        className="h-80 w-full"
        role="img"
      >
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={points} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />

            <XAxis
              dataKey="x"
              domain={["dataMin", "dataMax"]}
              label={{
                value: xLabel,
                position: "insideBottom",
                offset: -12,
                fill: CHART_AXIS_TICK.fill,
              }}
              stroke={CHART_GRID_COLOR}
              tick={CHART_AXIS_TICK}
              type="number"
            />

            <YAxis
              domain={[0, maxDepth]}
              label={{
                value: "End depth (mm)",
                angle: -90,
                position: "insideLeft",
                fill: CHART_AXIS_TICK.fill,
              }}
              stroke={CHART_GRID_COLOR}
              tick={CHART_AXIS_TICK}
              reversed
            />

            <ReferenceLine
              label={{
                value: `AHA minimum ${AHA_MINIMUM_DEPTH_MM} mm`,
                position: "insideBottomRight",
                fill: "var(--color-text-default-secondary)",
                fontSize: 12,
              }}
              stroke="var(--color-border-warning-tertiary)"
              strokeDasharray="6 4"
              y={AHA_MINIMUM_DEPTH_MM}
            />

            <Tooltip
              content={({ active, label, payload }) => {
                const point = payload[0];

                if (!active || !point) {
                  return null;
                }

                return (
                  <ChartTooltip
                    rows={[{ label: "End depth", value: `${Number(point.value).toFixed(1)} mm` }]}
                    title={hasTimestamps ? `${label} s` : `Compression ${label}`}
                  />
                );
              }}
            />

            <Line
              activeDot={{ r: 5 }}
              dataKey="depth"
              dot={{ r: 3 }}
              isAnimationActive={false}
              stroke={CHART_SERIES_COLOR}
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ChartDataTable
        caption="Compression end depth"
        headers={[xLabel, "End depth (mm)"]}
        rows={points.map((point) => {
          return { key: String(point.id), cells: [String(point.x), point.depth.toFixed(1)] };
        })}
      />
    </>
  );
};
