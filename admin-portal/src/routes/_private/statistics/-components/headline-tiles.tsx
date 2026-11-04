import { hoursToMinutes, secondsToHours, secondsToMinutes } from "date-fns";
import { tv } from "tailwind-variants";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SCORE_BAND } from "@/constants/score-band";
import type { PerformanceStats } from "@/services/stats";
import { formatPercent } from "@/utils/format-percent";
import { formatScore } from "@/utils/score";
import { getScoreBand } from "@/utils/score-band";

const headlineTileVariants = tv({
  slots: {
    root: "grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7",
    tile: "gap-1 p-4",
    label: "text-sm text-text-default-secondary",
    valueRow: "flex items-baseline justify-between gap-2",
    value: "shrink-0 text-3xl font-bold text-text-default-default tabular-nums",
    hint: "min-w-0 truncate text-sm text-text-default-secondary",
  },
  variants: {
    band: {
      [SCORE_BAND.HIGH]: { value: "text-text-success-default" },
      [SCORE_BAND.MEDIUM]: { value: "text-text-warning-default" },
      [SCORE_BAND.LOW]: { value: "text-text-destructive-default" },
    },
    isRefreshing: {
      true: { root: "opacity-60" },
      false: {},
    },
  },
  defaultVariants: { isRefreshing: false },
});

const { hint, label, root, tile, value, valueRow } = headlineTileVariants();

const TILE_LABEL = {
  SESSIONS: "Sessions",
  PARTICIPANTS: "Participants",
  REGISTRATIONS: "Registrations",
  REPEAT_RATE: "Repeat rate",
  AVERAGE_SCORE: "Average score",
  COMPRESSIONS: "Compressions",
  HANDS_ON_TIME: "Hands-on time",
} as const;

const SCORE_BAND_LABEL = {
  [SCORE_BAND.HIGH]: "High",
  [SCORE_BAND.MEDIUM]: "Medium",
  [SCORE_BAND.LOW]: "Low",
} as const;

const formatCount = (count: number) => {
  return count.toLocaleString("en-US");
};

const formatHandsOnTime = (seconds: number) => {
  const hours = secondsToHours(seconds);
  const minutes = secondsToMinutes(seconds) - hoursToMinutes(hours);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return seconds > 0 ? "< 1m" : "0m";
};

type HeadlineTilesProps = {
  isRefreshing?: boolean;
  stats: PerformanceStats | undefined;
};

export const HeadlineTiles = ({ isRefreshing, stats }: HeadlineTilesProps) => {
  if (!stats) {
    return (
      <div className={root()}>
        {Object.values(TILE_LABEL).map((tileLabel) => {
          return <Skeleton key={tileLabel} className="h-24 w-full rounded-xl" />;
        })}
      </div>
    );
  }

  const { totals } = stats;
  const band = totals.averageScore === null ? undefined : getScoreBand(totals.averageScore);
  const repeatShare = totals.participants > 0 ? totals.repeaters / totals.participants : null;

  return (
    <div className={root({ isRefreshing })}>
      <Card.Root className={tile()}>
        <span className={label()}>{TILE_LABEL.SESSIONS}</span>

        <span className={value()}>{formatCount(totals.sessions)}</span>
      </Card.Root>

      <Card.Root className={tile()}>
        <span className={label()}>{TILE_LABEL.PARTICIPANTS}</span>

        <span className={value()}>{formatCount(totals.participants)}</span>
      </Card.Root>

      <Card.Root className={tile()}>
        <span className={label()}>{TILE_LABEL.REGISTRATIONS}</span>

        <span className={value()}>{formatCount(totals.registrations)}</span>
      </Card.Root>

      <Card.Root className={tile()}>
        <span className={label()}>{TILE_LABEL.REPEAT_RATE}</span>

        <div className={valueRow()}>
          <span className={value()}>{formatPercent(repeatShare)}</span>

          <span className={hint()} title={`${formatCount(totals.repeaters)} came back`}>
            {formatCount(totals.repeaters)} came back
          </span>
        </div>
      </Card.Root>

      <Card.Root className={tile()}>
        <span className={label()}>{TILE_LABEL.AVERAGE_SCORE}</span>

        <div className={valueRow()}>
          <span className={value({ band })}>{formatScore(totals.averageScore)}</span>

          {band ? (
            <span className={hint()} title={SCORE_BAND_LABEL[band]}>
              {SCORE_BAND_LABEL[band]}
            </span>
          ) : null}
        </div>
      </Card.Root>

      <Card.Root className={tile()}>
        <span className={label()}>{TILE_LABEL.COMPRESSIONS}</span>

        <span className={value()}>{formatCount(totals.compressions)}</span>
      </Card.Root>

      <Card.Root className={tile()}>
        <span className={label()}>{TILE_LABEL.HANDS_ON_TIME}</span>

        <span className={value()}>{formatHandsOnTime(totals.handsOnSeconds)}</span>
      </Card.Root>
    </div>
  );
};
