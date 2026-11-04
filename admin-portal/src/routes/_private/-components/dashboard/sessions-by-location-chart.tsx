import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ChartDataTable } from "@/components/charts/chart-data-table";
import {
  CHART_AXIS_TICK,
  CHART_CURSOR,
  CHART_GRID_COLOR,
  CHART_SERIES_COLOR,
} from "@/components/charts/chart-theme";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import { type LocationStat, locationStatSchema } from "@/services/stats";
import { formatScore } from "@/utils/score";

const BAR_RADIUS = 4;
const ROW_HEIGHT = 40;
const CHART_PADDING = 40;
const MIN_HEIGHT = 160;
const LABEL_WIDTH = 140;
const MAX_BAR_SIZE = 20;

type SessionsByLocationChartProps = {
  rows: LocationStat[];
};

export const SessionsByLocationChart = ({ rows }: SessionsByLocationChartProps) => {
  const sortedRows = [...rows].sort((first, second) => {
    return second.count - first.count;
  });

  const locationNames = new Map(
    sortedRows.map((row) => {
      return [row.locationId, row.name];
    }),
  );

  return (
    <>
      <div
        aria-label="Sessions by location"
        className="w-full"
        role="img"
        style={{ height: Math.max(MIN_HEIGHT, sortedRows.length * ROW_HEIGHT + CHART_PADDING) }}
      >
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            data={sortedRows}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
          >
            <CartesianGrid horizontal={false} stroke={CHART_GRID_COLOR} />

            <XAxis
              allowDecimals={false}
              stroke={CHART_GRID_COLOR}
              tick={CHART_AXIS_TICK}
              tickLine={false}
              type="number"
            />

            <YAxis
              axisLine={false}
              dataKey="locationId"
              tick={CHART_AXIS_TICK}
              tickFormatter={(locationId: string) => {
                return locationNames.get(locationId) ?? locationId;
              }}
              tickLine={false}
              type="category"
              width={LABEL_WIDTH}
            />

            <Tooltip
              content={({ active, payload }) => {
                const parsed = locationStatSchema.safeParse(payload[0]?.payload);
                const row = parsed.success
                  ? sortedRows.find((item) => {
                      return item.locationId === parsed.data.locationId;
                    })
                  : undefined;

                return active && row ? (
                  <ChartTooltip
                    rows={[
                      { label: "sessions", value: String(row.count) },
                      {
                        label: "average score",
                        value: formatScore(row.averageScore),
                      },
                    ]}
                    title={row.name}
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
              radius={[0, BAR_RADIUS, BAR_RADIUS, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ChartDataTable
        caption="Sessions by location"
        headers={["Location", "Sessions", "Average score"]}
        rows={sortedRows.map((row) => {
          return {
            key: row.locationId,
            cells: [row.name, String(row.count), formatScore(row.averageScore)],
          };
        })}
      />
    </>
  );
};
