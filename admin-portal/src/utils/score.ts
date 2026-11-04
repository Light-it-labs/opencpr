import { MAX_SCORE } from "@/services/sessions";

export const MAX_SCORE_PERCENT = 100;

const DECIMAL_SCALE = 10;

/** Share of MAX_SCORE as a percentage with one decimal (640 → 64, 711 → 71.1). */
export const toScorePercent = (score: number) => {
  return Math.round((score / MAX_SCORE) * MAX_SCORE_PERCENT * DECIMAL_SCALE) / DECIMAL_SCALE;
};

export const formatScore = (score: number | null | undefined) => {
  return score === null || score === undefined ? "—" : `${toScorePercent(score)}%`;
};
