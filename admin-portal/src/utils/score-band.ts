import { SCORE_BAND, type ScoreBand } from "@/constants/score-band";
import { MAX_SCORE } from "@/services/sessions";

export const HIGH_SCORE_MIN_SHARE = 0.8;
export const MEDIUM_SCORE_MIN_SHARE = 0.5;

export const getScoreBand = (score: number): ScoreBand => {
  const share = score / MAX_SCORE;

  if (share >= HIGH_SCORE_MIN_SHARE) {
    return SCORE_BAND.HIGH;
  }

  if (share >= MEDIUM_SCORE_MIN_SHARE) {
    return SCORE_BAND.MEDIUM;
  }

  return SCORE_BAND.LOW;
};
