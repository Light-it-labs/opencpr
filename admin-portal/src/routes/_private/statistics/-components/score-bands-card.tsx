import { tv } from "tailwind-variants";

import { ChartCard } from "@/components/charts/chart-card";
import { Badge } from "@/components/ui/badge";
import { SCORE_BAND, SCORE_BAND_BADGE_VARIANT } from "@/constants/score-band";
import type { PerformanceStats } from "@/services/stats";
import { formatPercent } from "@/utils/format-percent";
import { MAX_SCORE_PERCENT } from "@/utils/score";
import { HIGH_SCORE_MIN_SHARE, MEDIUM_SCORE_MIN_SHARE } from "@/utils/score-band";
import { ShareBar, type ShareBarTone } from "./share-bar";

const scoreBandsVariants = tv({
  slots: {
    root: "flex flex-col gap-6",
    grid: "grid grid-cols-3 gap-4",
    band: "flex flex-col items-start gap-1",
    count: "text-3xl font-bold text-text-default-default tabular-nums",
    hint: "text-sm text-text-default-secondary",
  },
});

const { band: bandClass, count, grid, hint, root } = scoreBandsVariants();

const BANDS = [
  {
    key: SCORE_BAND.HIGH,
    label: "High",
    threshold: `${HIGH_SCORE_MIN_SHARE * MAX_SCORE_PERCENT}% and above`,
    tone: "success",
  },
  {
    key: SCORE_BAND.MEDIUM,
    label: "Medium",
    threshold: `${MEDIUM_SCORE_MIN_SHARE * MAX_SCORE_PERCENT}% to under ${HIGH_SCORE_MIN_SHARE * MAX_SCORE_PERCENT}%`,
    tone: "warning",
  },
  {
    key: SCORE_BAND.LOW,
    label: "Low",
    threshold: `below ${MEDIUM_SCORE_MIN_SHARE * MAX_SCORE_PERCENT}%`,
    tone: "destructive",
  },
] as const satisfies {
  key: keyof PerformanceStats["scoreBands"];
  label: string;
  threshold: string;
  tone: ShareBarTone;
}[];

type ScoreBandsCardProps = {
  isRefreshing?: boolean;
  scoreBands: PerformanceStats["scoreBands"];
};

export const ScoreBandsCard = ({ isRefreshing, scoreBands }: ScoreBandsCardProps) => {
  const total = scoreBands.high + scoreBands.medium + scoreBands.low;

  return (
    <ChartCard
      description="Sessions in each score band"
      isRefreshing={isRefreshing}
      title="Score bands"
    >
      <div className={root()}>
        <div className={grid()}>
          {BANDS.map((band) => {
            const sessions = scoreBands[band.key];

            return (
              <div key={band.key} className={bandClass()}>
                <Badge size="sm" variant={SCORE_BAND_BADGE_VARIANT[band.key]}>
                  {band.label}
                </Badge>

                <span className={count()}>{sessions.toLocaleString("en-US")}</span>

                <span className={hint()}>
                  {formatPercent(total > 0 ? sessions / total : null)} · {band.threshold}
                </span>
              </div>
            );
          })}
        </div>

        <ShareBar
          label="Sessions by score band"
          segments={BANDS.map((band) => {
            return { label: band.label, tone: band.tone, value: scoreBands[band.key] };
          })}
        />
      </div>
    </ChartCard>
  );
};
