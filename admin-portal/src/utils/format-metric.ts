export const formatMetric = (value: number | null, suffix = "") => {
  return value === null ? "—" : `${value}${suffix}`;
};
