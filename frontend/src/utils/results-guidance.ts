import { CPR_TARGETS, MAX_SCORE, type SessionStatistics } from "./session-scoring";

/**
 * Derived from SessionStatistics only — the same numbers the screen shows — so a
 * tip can never contradict the cards above it.
 */

/** The four metrics the results screen shows, one card each. */
export type MetricKey = "fullCompressions" | "fullRebounds" | "averageDepth" | "averageBpm";

/** `id` selects the copy from the locale files; `values` fills its placeholders. */
export type ImprovementTip = {
  id: string;
  /**
   * The card this tip belongs under, so it can be shown next to the number that
   * earned it instead of in a separate list that repeats the card's own
   * explanation.
   */
  metric: MetricKey;
  values: Record<string, number | string>;
};

/**
 * What counts as good enough, for both a tip and the results cards. Demanding
 * all thirty compressions would mark every run but a flawless one as missed.
 */
export const ACCEPTABLE_RATIO = 0.9;
const STEADY_RATE_RATIO = 0.8;

const DEPTH_VALUES = {
  minCm: CPR_TARGETS.depthMinMm / 10,
  maxCm: CPR_TARGETS.depthMaxMm / 10,
};

const RATE_VALUES = {
  min: CPR_TARGETS.bpmMin,
  max: CPR_TARGETS.bpmMax,
};

/**
 * At most one tip per metric, which is what lets each one sit inside its own
 * card: the rate, depth and recoil checks below are mutually exclusive branches.
 * A flawless run earns none — what it gets instead is the overall summary.
 *
 * Ordered by the weight the scorer gives each dimension, which is also the order
 * in which they affect blood flow: telling someone to fix their recoil while
 * their rate is half of target would be true and useless.
 */
export const getImprovementTips = (statistics: SessionStatistics): ImprovementTip[] => {
  const {
    averageBpm,
    averageCompressionEndDepthMm,
    compressionsOnBpmRange,
    totalCompressions,
    totalFullCompressions,
    totalFullRebounds,
  } = statistics;

  if (totalCompressions === 0) {
    return [];
  }

  const candidates: { tip: ImprovementTip; impact: number }[] = [];

  const rateMissRatio = 1 - compressionsOnBpmRange / totalCompressions;
  const depthMissRatio = 1 - totalFullCompressions / totalCompressions;
  const recoilMissRatio = 1 - totalFullRebounds / totalCompressions;

  if (averageBpm < CPR_TARGETS.bpmMin) {
    candidates.push({
      tip: { id: "rateSlow", metric: "averageBpm", values: RATE_VALUES },
      impact: 0.3 * rateMissRatio,
    });
  } else if (averageBpm > CPR_TARGETS.bpmMax) {
    candidates.push({
      tip: { id: "rateFast", metric: "averageBpm", values: RATE_VALUES },
      impact: 0.3 * rateMissRatio,
    });
  } else if (compressionsOnBpmRange / totalCompressions < STEADY_RATE_RATIO) {
    candidates.push({
      tip: { id: "rateUnsteady", metric: "averageBpm", values: RATE_VALUES },
      impact: 0.3 * rateMissRatio,
    });
  }

  // Too shallow costs the depth band and the full-compression flag both, so it
  // outranks a rate miss of the same size.
  if (averageCompressionEndDepthMm < CPR_TARGETS.depthMinMm) {
    candidates.push({
      tip: { id: "depthShallow", metric: "averageDepth", values: DEPTH_VALUES },
      impact: 0.5 * depthMissRatio,
    });
  } else if (averageCompressionEndDepthMm > CPR_TARGETS.depthMaxMm) {
    candidates.push({
      tip: { id: "depthDeep", metric: "averageDepth", values: DEPTH_VALUES },
      impact: 0.3,
    });
  } else if (depthMissRatio > 1 - ACCEPTABLE_RATIO) {
    // The average is inside the band but individual compressions fell short,
    // which is the full-compressions count rather than the average depth.
    candidates.push({
      tip: { id: "depthInconsistent", metric: "fullCompressions", values: DEPTH_VALUES },
      impact: 0.5 * depthMissRatio,
    });
  }

  if (recoilMissRatio > 1 - ACCEPTABLE_RATIO) {
    candidates.push({
      tip: { id: "recoil", metric: "fullRebounds", values: {} },
      impact: 0.2 * recoilMissRatio,
    });
  }

  return candidates
    .sort((first, second) => {
      return second.impact - first.impact;
    })
    .map(({ tip }) => {
      return tip;
    });
};

/**
 * How the run went as a whole, in one line, for every run rather than only a
 * flawless one. Deliberately says nothing about technique: the cards already
 * carry that, and repeating it here is what made the old tips list redundant.
 * This is the framing — how close they came, and whether to try again.
 *
 * Banded on the percentage the ring shows, so the words and the number cannot
 * disagree.
 */
const SUMMARY_BANDS = [
  { id: "good", minPercentage: 70 },
  { id: "fair", minPercentage: 50 },
  { id: "keepPracticing", minPercentage: 0 },
] as const;

/**
 * How the screen is colored, and which of the three verdicts it heads with.
 *
 * The top tone is reserved for a run with nothing flagged at all, because the
 * verdict it carries claims outright success and sits directly above the count
 * of objectives met: shouting it over "2 de 4" contradicts the line below it.
 */
export const RESULTS_TONES = {
  HIGH: "high",
  MID: "mid",
  LOW: "low",
} as const;

export type ResultsTone = (typeof RESULTS_TONES)[keyof typeof RESULTS_TONES];

const TONE_BY_SUMMARY: Record<string, ResultsTone> = {
  excellent: RESULTS_TONES.HIGH,
  good: RESULTS_TONES.MID,
  fair: RESULTS_TONES.MID,
  keepPracticing: RESULTS_TONES.LOW,
};

export type ResultsSummary = {
  id: string;
  /** True only for a flawless run, where the line is praise rather than a nudge. */
  isPraise: boolean;
  tone: ResultsTone;
};

export const getResultsSummary = (statistics: SessionStatistics): ResultsSummary | null => {
  // Nothing was measured, so there is nothing to say about how it went.
  if (statistics.totalCompressions === 0) {
    return null;
  }

  // Praise is earned by having nothing flagged, not by clearing a score
  // threshold: a high score can still carry a tip, and calling that technique
  // flawless would contradict the card sitting right above this line.
  if (getImprovementTips(statistics).length === 0) {
    return { id: "excellent", isPraise: true, tone: RESULTS_TONES.HIGH };
  }

  const percentage = (statistics.score / MAX_SCORE) * 100;

  const band =
    SUMMARY_BANDS.find((candidate) => {
      return percentage >= candidate.minPercentage;
    }) ?? SUMMARY_BANDS[SUMMARY_BANDS.length - 1];

  return {
    id: band.id,
    isPraise: false,
    tone: TONE_BY_SUMMARY[band.id] ?? RESULTS_TONES.LOW,
  };
};
