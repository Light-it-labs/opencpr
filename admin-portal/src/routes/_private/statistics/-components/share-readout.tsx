import { tv } from "tailwind-variants";

const shareReadoutVariants = tv({
  slots: {
    root: "flex flex-col items-end",
    value: "text-2xl font-bold text-text-default-default tabular-nums",
    label: "text-xs text-text-default-secondary",
  },
});

const { label: labelClass, root, value: valueClass } = shareReadoutVariants();

type ShareReadoutProps = {
  label: string;
  value: string;
};

export const ShareReadout = ({ label, value }: ShareReadoutProps) => {
  return (
    <div className={root()}>
      <span className={valueClass()}>{value}</span>

      <span className={labelClass()}>{label}</span>
    </div>
  );
};
