export const SCORE_BAND = { HIGH: "high", MEDIUM: "medium", LOW: "low" } as const;

export type ScoreBand = (typeof SCORE_BAND)[keyof typeof SCORE_BAND];

export const SCORE_BAND_BADGE_VARIANT = {
  [SCORE_BAND.HIGH]: "success",
  [SCORE_BAND.MEDIUM]: "warning",
  [SCORE_BAND.LOW]: "destructive",
} as const;
