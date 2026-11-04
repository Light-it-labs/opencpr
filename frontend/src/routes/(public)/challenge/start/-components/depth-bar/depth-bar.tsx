import { useTranslation } from "react-i18next";

import type { DerivedCompression } from "@/utils";
import { useDepthBarCompressionAnimation } from "./use-depth-bar-compression-animation";

type DepthBarProps = {
  currentReading: DerivedCompression;
  sweetSpotMm: number;
  maxDepthMm: number;
};

export const DepthBar = ({ currentReading, maxDepthMm, sweetSpotMm }: DepthBarProps) => {
  const { t } = useTranslation();

  const animatedDepth = useDepthBarCompressionAnimation({
    // null until the firmware's interval window fills; the hook falls back to a
    // default cadence when it isn't a positive number.
    bpm: currentReading.bpm ?? 0,
    targetDepthMm: currentReading.endDepthMm,
    timestamp: currentReading.timestampMs,
  });

  // Depth bar values - use animated depth for smooth transition
  const endDepthCm = Math.max(0, animatedDepth) * 10;
  const fillPercent = Math.min(endDepthCm / maxDepthMm, 1);
  const remainingPercent = 1 - fillPercent;
  const sweetSpotPercent = sweetSpotMm / maxDepthMm;

  // Calculate gradient stops so green aligns with sweet spot
  const sweetSpotPercentForGradient = sweetSpotPercent * 100;
  const beforeSweetSpot = Math.max(0, sweetSpotPercentForGradient - 15);
  const afterSweetSpot = Math.min(100, sweetSpotPercentForGradient + 15);

  return (
    <div className="flex justify-center gap-4">
      <div className="relative ml-12 h-72 w-12 overflow-hidden rounded-md border shadow-sm">
        {/* Full bar with gradient: red (top/surface) -> yellow -> green (sweet spot) -> yellow -> red (bottom/deep) */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, var(--results-low) 0%, var(--results-mid) ${beforeSweetSpot}%, var(--results-high) ${sweetSpotPercentForGradient}%, var(--results-mid) ${afterSweetSpot}%, var(--results-low) 100%)`,
          }}
        />

        {/* Sweet spot dashed line */}
        <div
          className="absolute right-0 left-0 z-10 border-b-2 border-dashed border-foreground"
          style={{ top: `${sweetSpotPercent * 100}%` }}
          aria-hidden
        />

        {/* Previous value dashed line */}
        <div
          className="absolute right-0 left-0 z-10 border-b-2 border-dashed border-primary"
          style={{
            top: `${(currentReading.endDepthMm / maxDepthMm) * 100}%`,
          }}
          aria-hidden
        />

        {/* Overlay to hide the unfilled (bottom) part */}
        <div
          className="absolute right-0 bottom-0 left-0 bg-card/80"
          style={{ height: `${remainingPercent * 100}%` }}
          aria-hidden
        />
      </div>
      <div className="relative flex h-72 flex-col justify-between text-lg text-foreground">
        <span>{t("challenge.execution.centimeters", { value: 0 })}</span>

        <span
          className="absolute left-0 -translate-y-1/2 text-lg whitespace-nowrap"
          style={{ top: `${sweetSpotPercent * 100}%` }}
        >
          {t("challenge.execution.centimeters", { value: sweetSpotMm / 10 })}
        </span>

        <span
          className="absolute -left-32 -translate-y-1/2 text-lg font-bold whitespace-nowrap text-foreground"
          style={{
            top: `${Math.max((endDepthCm / maxDepthMm) * 100, 4)}%`,
          }}
        >
          {t("challenge.execution.centimeters", {
            value: (currentReading.endDepthMm / 10).toFixed(1),
          })}
        </span>

        <span>{t("challenge.execution.centimeters", { value: maxDepthMm / 10 })}</span>
      </div>
    </div>
  );
};
