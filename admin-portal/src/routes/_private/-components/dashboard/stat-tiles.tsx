import { tv } from "tailwind-variants";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SCORE_BAND } from "@/constants/score-band";
import type { Stats } from "@/services/stats";
import { formatScore } from "@/utils/score";
import { getScoreBand } from "@/utils/score-band";

const statTileVariants = tv({
  slots: {
    root: "grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-4",
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

const { hint, label, root, tile, value, valueRow } = statTileVariants();

const TILE_LABEL = {
  SESSIONS: "Sessions",
  PARTICIPANTS: "Participants",
  AVERAGE_SCORE: "Average score",
  KIOSKS_ONLINE: "Kiosks online",
} as const;

const SCORE_BAND_LABEL = {
  [SCORE_BAND.HIGH]: "High band",
  [SCORE_BAND.MEDIUM]: "Medium band",
  [SCORE_BAND.LOW]: "Low band",
} as const;

type StatTilesProps = {
  isRefreshing?: boolean;
  stats: Stats | undefined;
};

export const StatTiles = ({ isRefreshing, stats }: StatTilesProps) => {
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

  return (
    <div className={root({ isRefreshing })}>
      <Card.Root className={tile()}>
        <span className={label()}>{TILE_LABEL.SESSIONS}</span>

        <span className={value()}>{totals.sessions}</span>
      </Card.Root>

      <Card.Root className={tile()}>
        <span className={label()}>{TILE_LABEL.PARTICIPANTS}</span>

        <span className={value()}>{totals.participants}</span>
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
        <span className={label()}>{TILE_LABEL.KIOSKS_ONLINE}</span>

        <span className={value()}>
          {totals.kiosksOnline} of {totals.kiosksTotal}
        </span>
      </Card.Root>
    </div>
  );
};
