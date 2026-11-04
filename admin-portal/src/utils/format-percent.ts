const PERCENT = 100;

/** 0–1 share as a percentage with one decimal; "—" when there is no denominator. */
export const formatPercent = (share: number | null) => {
  return share === null ? "—" : `${(share * PERCENT).toFixed(1)}%`;
};
