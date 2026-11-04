import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { tv } from "tailwind-variants";

import { ChartCard } from "@/components/charts/chart-card";
import { ChartDataTable } from "@/components/charts/chart-data-table";
import {
  CHART_AXIS_TICK,
  CHART_CURSOR,
  CHART_GRID_COLOR,
  CHART_SERIES_COLOR,
} from "@/components/charts/chart-theme";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import type { AttemptStat, PerformanceStats } from "@/services/stats";
import { formatScore, MAX_SCORE_PERCENT, toScorePercent } from "@/utils/score";
import { ShareBar } from "./share-bar";

const BAR_RADIUS = 4;
const MAX_BAR_SIZE = 48;

const ATTEMPT_LABEL: Record<AttemptStat["attempt"], string> = { 1: "1", 2: "2", 3: "3", 4: "4+" };

const retryEffectVariants = tv({
  slots: {
    root: "flex flex-col gap-6",
    comparison: "grid grid-cols-2 gap-4",
    stat: "flex flex-col gap-1",
    label: "text-sm text-text-default-secondary",
    value: "text-3xl font-bold text-text-default-default tabular-nums",
    heading: "text-sm font-medium text-text-default-default",
    note: "text-sm text-text-default-secondary",
  },
});

const { comparison, heading, label, note, root, stat, value } = retryEffectVariants();

type RetryEffectCardProps = {
  isRefreshing?: boolean;
  retry: PerformanceStats["retry"];
};

export const RetryEffectCard = ({ isRefreshing, retry }: RetryEffectCardProps) => {
  const points = retry.byAttempt.map((row) => {
    return {
      label: ATTEMPT_LABEL[row.attempt],
      sessions: row.sessions,
      averageScore: row.averageScore,
      scorePercent: row.averageScore === null ? null : toScorePercent(row.averageScore),
    };
  });

  return (
    <ChartCard
      description="How the last attempt of participants who came back compares with their first"
      isRefreshing={isRefreshing}
      title="Retry effect"
    >
      <div className={root()}>
        {retry.repeaters > 0 ? (
          <>
            <div className={comparison()}>
              <div className={stat()}>
                <span className={label()}>First attempt</span>

                <span className={value()}>{formatScore(retry.firstAttemptAverage)}</span>
              </div>

              <div className={stat()}>
                <span className={label()}>Last attempt</span>

                <span className={value()}>{formatScore(retry.lastAttemptAverage)}</span>
              </div>
            </div>

            <ShareBar
              label="Repeat outcomes"
              segments={[
                { label: "improved", tone: "success", value: retry.improved },
                { label: "slipped", tone: "destructive", value: retry.slipped },
                { label: "level", tone: "neutral", value: retry.level },
              ]}
              withLegend
            />
          </>
        ) : (
          <p className={note()}>No participant has more than one session in this range.</p>
        )}

        <div className="flex flex-col gap-2">
          <span className={heading()}>Mean score by attempt</span>

          <div aria-label="Mean score by attempt" className="h-48 w-full" role="img">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={CHART_GRID_COLOR} vertical={false} />

                <XAxis
                  dataKey="label"
                  stroke={CHART_GRID_COLOR}
                  tick={CHART_AXIS_TICK}
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
                  content={({ active, label: activeLabel }) => {
                    const point = points.find((item) => {
                      return item.label === activeLabel;
                    });

                    return active && point ? (
                      <ChartTooltip
                        rows={[
                          { label: "average score", value: formatScore(point.averageScore) },
                          { label: "sessions", value: String(point.sessions) },
                        ]}
                        title={`Attempt ${point.label}`}
                      />
                    ) : null;
                  }}
                  cursor={CHART_CURSOR}
                />

                <Bar
                  dataKey="scorePercent"
                  fill={CHART_SERIES_COLOR}
                  isAnimationActive={false}
                  maxBarSize={MAX_BAR_SIZE}
                  radius={[BAR_RADIUS, BAR_RADIUS, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ChartDataTable
            caption="Mean score by attempt"
            headers={["Attempt", "Average score", "Sessions"]}
            rows={points.map((point) => {
              return {
                key: point.label,
                cells: [point.label, formatScore(point.averageScore), String(point.sessions)],
              };
            })}
          />
        </div>
      </div>
    </ChartCard>
  );
};
