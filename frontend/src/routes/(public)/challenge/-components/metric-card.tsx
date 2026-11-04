import type { ComponentType, ReactNode, SVGProps } from "react";
import { useTranslation } from "react-i18next";

import { Icons } from "@/components/ui";
import { CPR_TARGETS, type ImprovementTip, type MetricKey } from "@/utils";

export type Metric = {
  /** Locale key under `challenge.results.metrics`, and the tip routing key. */
  key: MetricKey;
  value: ReactNode;
  /** What follows the number: a unit for an average, the total for a count. */
  unit: ReactNode;
  target: string;
  isOnTarget: boolean;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /**
   * How this run sits against the target, 0 to 1, for the bar under the number.
   * A count fills from the left; an average marks a point inside its band.
   */
  progress: number;
  /**
   * Where the acceptable band sits on that same 0-to-1 scale, when the metric is
   * judged by a range rather than by how high it got. Absent for counts, which
   * are simply "as many as possible".
   */
  band?: { from: number; to: number };
  /**
   * The tip this run earned on this metric, when it earned one. It replaces the
   * generic explanation rather than joining it: both say the same thing, and the
   * actionable wording is the one worth the space.
   */
  tip?: ImprovementTip;
};

type MetricCardProps = {
  metric: Metric;
  /** Position in the row, which is what staggers this card's entrance. */
  index: number;
};

/** Cards land one after another, after the verdict above them has settled. */
const CARD_ENTRANCE_DELAY_MS = 610;
const CARD_ENTRANCE_STAGGER_MS = 130;

const clampPercentage = (value: number) => {
  return `${Math.min(100, Math.max(0, value * 100))}%`;
};

/**
 * One number from the run, the target it is measured by, and what to do about
 * it — all on the card. On a kiosk nobody is going to ask an instructor whether
 * 4.3 cm was any good, and nobody taps a card to find out either.
 */
export const MetricCard = ({ index, metric }: MetricCardProps) => {
  const { t } = useTranslation();

  const { band, icon: MetricIcon, isOnTarget, key, progress, target, tip, unit, value } = metric;
  const copy = `challenge.results.metrics.${key}`;

  // The explanations quote the guideline numbers, so they read from the same
  // constants the scorer judges against.
  const guidelines = {
    minCm: CPR_TARGETS.depthMinMm / 10,
    maxCm: CPR_TARGETS.depthMaxMm / 10,
    min: CPR_TARGETS.bpmMin,
    max: CPR_TARGETS.bpmMax,
  };

  const guidance = tip
    ? t(`challenge.results.tips.${tip.id}`, tip.values)
    : t(`${copy}.why`, guidelines);

  // A tick when the target was met, a lightbulb when it wasn't: the icon says
  // whether the paragraph is background or something to act on before it gets
  // read. It follows the target, not the tip — a missed target with no tip of
  // its own still isn't a pass.
  const GuidanceIcon = isOnTarget ? Icons.Check : Icons.Lightbulb;

  const entranceDelayMs = CARD_ENTRANCE_DELAY_MS + index * CARD_ENTRANCE_STAGGER_MS;

  const toneColor = isOnTarget ? "text-results-high" : "text-results-mid";
  const toneFill = isOnTarget ? "bg-results-high" : "bg-results-mid";

  return (
    <div
      className="flex flex-1 results-rise flex-col gap-4 rounded-2xl border border-results-ink/10 bg-results-surface p-5 text-results-ink"
      style={{ animationDelay: `${entranceDelayMs}ms` }}
    >
      <div className="flex items-center gap-2.5">
        <MetricIcon className="size-9 shrink-0 text-results-ink/55" />

        <span className="text-xl text-results-ink/70">{t(`${copy}.label`)}</span>
      </div>

      <div className="flex flex-col gap-3">
        <p className={`flex items-baseline gap-1.5 ${toneColor}`}>
          <span className="font-heading text-5xl leading-none font-bold">{value}</span>
          <span className="text-lg text-results-ink/65">{unit}</span>
        </p>

        {/* A count fills the bar; an average puts a marker on it and shades the
            band it should have landed in, so being outside is visible as a
            position rather than only as a color. */}
        {/* Two layers, because the marker has to overhang the track it marks:
            the track clips its own fill, the caret sits outside that clip. */}
        <div className="relative h-3 w-full">
          <div className="absolute inset-0 overflow-hidden rounded-full bg-results-ink/10">
            {band ? (
              <span
                className="absolute inset-y-0 results-bar bg-results-high/20"
                style={{
                  left: clampPercentage(band.from),
                  width: clampPercentage(band.to - band.from),
                  animationDelay: `${entranceDelayMs + 200}ms`,
                }}
              />
            ) : (
              <span
                className={`absolute inset-y-0 left-0 results-bar rounded-full ${toneFill}`}
                style={{
                  width: clampPercentage(progress),
                  animationDelay: `${entranceDelayMs + 200}ms`,
                }}
              />
            )}
          </div>

          {/* A text caret, not a dot: centred on the reading and taller than the
              track, so an average that landed outside its band is unmissable.
              The class centres it when the entrance animation is switched off;
              the keyframe carries the same translate while it runs. */}
          {band ? (
            <span
              className={`absolute -inset-y-1.5 w-1 -translate-x-1/2 results-tick rounded-full ${toneFill}`}
              style={{
                left: clampPercentage(progress),
                animationDelay: `${entranceDelayMs + 320}ms`,
              }}
            />
          ) : null}
        </div>

        <span className="text-sm text-results-ink/65">
          {t("challenge.results.metrics.targetPrefix", { target })}
        </span>
      </div>

      <div className="flex items-start gap-2.5 border-t border-results-ink/10 pt-4 text-base">
        <GuidanceIcon className={`mt-0.5 size-5 shrink-0 ${toneColor}`} aria-hidden />

        <span className="text-results-ink/70">{guidance}</span>
      </div>
    </div>
  );
};
