import { tv, type VariantProps } from "tailwind-variants";

const PERCENT = 100;

const shareBarVariants = tv({
  slots: {
    root: "flex flex-col gap-2",
    track: "flex h-2 w-full overflow-hidden rounded-full bg-background-default-secondary",
    segment: "h-full",
    legend: "flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-default-secondary",
    legendItem: "flex items-center gap-1.5",
    dot: "size-2 rounded-full",
    count: "font-semibold text-text-default-default tabular-nums",
  },
  variants: {
    tone: {
      brand: { segment: "bg-background-brand-default", dot: "bg-background-brand-default" },
      success: { segment: "bg-background-success-default", dot: "bg-background-success-default" },
      warning: { segment: "bg-background-warning-default", dot: "bg-background-warning-default" },
      destructive: {
        segment: "bg-background-destructive-default",
        dot: "bg-background-destructive-default",
      },
      neutral: { segment: "bg-background-default-tertiary", dot: "bg-background-default-tertiary" },
    },
  },
});

const { count, dot, legend, legendItem, root, segment, track } = shareBarVariants();

export type ShareBarTone = NonNullable<VariantProps<typeof shareBarVariants>["tone"]>;

export type ShareBarSegment = {
  label: string;
  tone: ShareBarTone;
  value: number;
};

type ShareBarProps = {
  label: string;
  segments: ShareBarSegment[];
  /** Denominator for the widths; defaults to the sum of the segments. */
  total?: number;
  withLegend?: boolean;
};

export const ShareBar = ({ label, segments, total, withLegend = false }: ShareBarProps) => {
  const denominator =
    total ??
    segments.reduce((sum, item) => {
      return sum + item.value;
    }, 0);

  const summary = segments
    .map((item) => {
      return `${item.label} ${item.value}`;
    })
    .join(", ");

  return (
    <div className={root()}>
      <div aria-label={`${label}: ${summary}`} className={track()} role="img">
        {segments.map((item) => {
          return denominator > 0 && item.value > 0 ? (
            <div
              key={item.label}
              className={segment({ tone: item.tone })}
              style={{ width: `${(item.value / denominator) * PERCENT}%` }}
            />
          ) : null;
        })}
      </div>

      {withLegend ? (
        <ul className={legend()}>
          {segments.map((item) => {
            return (
              <li key={item.label} className={legendItem()}>
                <span className={dot({ tone: item.tone })} aria-hidden />

                <span className={count()}>{item.value}</span>

                {item.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};
