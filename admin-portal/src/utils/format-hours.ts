type FormatHoursProps = {
  closesAt: string | null;
  opensAt: string | null;
};

export const formatHours = ({ closesAt, opensAt }: FormatHoursProps) => {
  return opensAt && closesAt ? `${opensAt} – ${closesAt}` : "Always";
};
