import { tv } from "tailwind-variants";

const chartTooltipVariants = tv({
  slots: {
    root: "flex flex-col gap-1 rounded-md border border-border-default-default bg-background-default-default px-3 py-2 text-sm shadow-md",
    title: "font-medium text-text-default-default",
    row: "flex items-baseline gap-2",
    value: "font-semibold text-text-default-default tabular-nums",
    label: "text-text-default-secondary",
  },
});

const { label, root, row, title, value } = chartTooltipVariants();

type ChartTooltipRow = {
  label: string;
  value: string;
};

type ChartTooltipProps = {
  rows: ChartTooltipRow[];
  title: string;
};

export const ChartTooltip = ({ rows, title: heading }: ChartTooltipProps) => {
  return (
    <div className={root()}>
      <span className={title()}>{heading}</span>

      {rows.map((item) => {
        return (
          <div key={item.label} className={row()}>
            <span className={value()}>{item.value}</span>

            <span className={label()}>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};
