import { tv } from "tailwind-variants";

import { ChartCard } from "@/components/charts/chart-card";
import type { PerformanceStats } from "@/services/stats";
import { formatPercent } from "@/utils/format-percent";
import { ShareBar } from "./share-bar";

const qualityMetersVariants = tv({
  slots: {
    root: "flex flex-col gap-5",
    meter: "flex flex-col gap-2",
    meterHeader: "flex items-baseline justify-between gap-2",
    label: "text-sm text-text-default-default",
    hint: "text-sm text-text-default-secondary",
    value: "text-lg font-semibold text-text-default-default tabular-nums",
  },
});

const { hint, label, meter, meterHeader, root, value } = qualityMetersVariants();

const METERS = [
  { key: "fullDepthShare", label: "Full depth", hint: "at least 50 mm" },
  { key: "fullRecoilShare", label: "Full recoil", hint: "within 5 mm of release" },
  { key: "onRateShare", label: "On rate", hint: "100–120 bpm" },
] as const satisfies { key: keyof PerformanceStats["quality"]; label: string; hint: string }[];

type QualityMetersProps = {
  isRefreshing?: boolean;
  quality: PerformanceStats["quality"];
};

export const QualityMeters = ({ isRefreshing, quality }: QualityMetersProps) => {
  return (
    <ChartCard
      description="Share of all compressions in this range that met each guideline"
      isRefreshing={isRefreshing}
      title="Compression quality"
    >
      <div className={root()}>
        {METERS.map((item) => {
          const share = quality[item.key];

          return (
            <div key={item.key} className={meter()}>
              <div className={meterHeader()}>
                <span className={label()}>
                  {item.label} <span className={hint()}>· {item.hint}</span>
                </span>

                <span className={value()}>{formatPercent(share)}</span>
              </div>

              <ShareBar
                label={item.label}
                segments={[{ label: item.label, tone: "brand", value: share ?? 0 }]}
                total={1}
              />
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
};
