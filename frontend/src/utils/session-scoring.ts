import type { CprCompression, CprSession } from "@/stores";

// Return type matches the database fields for session statistics
export type SessionStatistics = Required<
  Pick<
    CprSession,
    | "score"
    | "totalCompressions"
    | "totalFullCompressions"
    | "totalFullRebounds"
    | "compressionsOnBpmRange"
    | "averageBpm"
    | "averageCompressionEndDepthMm"
  >
>;

// The only place CPR guideline numbers live. The firmware reports millimeters
// and timestamps; every judgement about them is made here.
const IDEAL_DEPTH_MIN = 50;
const IDEAL_DEPTH_MAX = 60;
const IDEAL_BPM_MIN = 100;
const IDEAL_BPM_MAX = 120;
/** Chest is considered fully released at or below this residual depth. */
const FULL_RECOIL_MAX_DEPTH_MM = 5;
/** Compressions averaged over this many intervals to get a stable rate. */
const BPM_WINDOW = 3;

/** Re-exported for the screens that show a participant what they aimed at. */
export const CPR_TARGETS = {
  depthMinMm: IDEAL_DEPTH_MIN,
  depthMaxMm: IDEAL_DEPTH_MAX,
  bpmMin: IDEAL_BPM_MIN,
  bpmMax: IDEAL_BPM_MAX,
  fullRecoilMaxDepthMm: FULL_RECOIL_MAX_DEPTH_MM,
} as const;

export type DerivedCompression = CprCompression & {
  bpm: number | null;
  hasFullyCompressed: boolean;
  hasFullyRebounded: boolean;
};

/**
 * Turns raw measurements into the values the score and the live UI need.
 * Rate comes from timestamp deltas within this session, so it cannot carry over
 * from a previous participant the way firmware-side state used to.
 */
export const deriveCompressions = (compressions: CprCompression[]): DerivedCompression[] => {
  const intervals: number[] = [];
  let previousTimestampMs: number | null = null;

  return compressions.map((compression) => {
    if (previousTimestampMs !== null) {
      const interval = compression.timestampMs - previousTimestampMs;

      if (interval > 0) {
        intervals.push(interval);

        if (intervals.length > BPM_WINDOW) {
          intervals.shift();
        }
      }
    }

    previousTimestampMs = compression.timestampMs;

    const averageInterval =
      intervals.length > 0
        ? intervals.reduce((sum, value) => {
            return sum + value;
          }, 0) / intervals.length
        : 0;

    return {
      ...compression,
      bpm: averageInterval > 0 ? 60000 / averageInterval : null,
      hasFullyCompressed: compression.endDepthMm >= IDEAL_DEPTH_MIN,
      hasFullyRebounded: compression.startDepthMm <= FULL_RECOIL_MAX_DEPTH_MM,
    };
  });
};

// Maximum score constant
export const MAX_SCORE = 1000;

// Scoring weights (all must be perfect for max score)
const WEIGHTS = {
  DEPTH: 0.3,
  RATE: 0.3,
  RECOIL: 0.2,
  COMPRESSION: 0.2,
} as const;

// Helper functions
const clamp01 = (x: number): number => {
  return Math.max(0, Math.min(1, x));
};

const calculateStandardDeviation = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }
  const mean =
    values.reduce((sum, val) => {
      return sum + val;
    }, 0) / values.length;
  const variance =
    values.reduce((sum, val) => {
      return sum + (val - mean) ** 2;
    }, 0) / values.length;

  return Math.sqrt(variance);
};

const getBandScore = (value: number, idealMin: number, idealMax: number): number => {
  const nearMin = idealMin - 5;
  const nearMax = idealMax + 5;

  if (value >= idealMin && value <= idealMax) {
    return 1.0;
  }
  if ((value >= nearMin && value < idealMin) || (value > idealMax && value <= nearMax)) {
    return 0.7;
  }

  const farMin = nearMin - 2;
  const farMax = nearMax + 2;
  if ((value >= farMin && value < nearMin) || (value > nearMax && value <= farMax)) {
    return 0.4;
  }

  return 0.0;
};

const isCompressionPerfect = (compression: DerivedCompression, effectiveBpm: number): boolean => {
  return (
    effectiveBpm >= IDEAL_BPM_MIN &&
    effectiveBpm <= IDEAL_BPM_MAX &&
    compression.endDepthMm >= IDEAL_DEPTH_MIN &&
    compression.endDepthMm <= IDEAL_DEPTH_MAX &&
    compression.hasFullyRebounded &&
    compression.hasFullyCompressed
  );
};

export const scoreSession = (raw: CprCompression[]): SessionStatistics => {
  const compressions = deriveCompressions(raw);

  const defaultStats: SessionStatistics = {
    score: 0,
    totalCompressions: 0,
    totalFullCompressions: 0,
    totalFullRebounds: 0,
    compressionsOnBpmRange: 0,
    averageBpm: 0,
    averageCompressionEndDepthMm: 0,
  };

  if (!compressions?.length) {
    return defaultStats;
  }

  const validBpmValues = compressions
    .filter((c) => {
      return c.bpm !== null && c.bpm > 60;
    })
    .map((c) => {
      return c.bpm!;
    });

  const averageBpm =
    validBpmValues.length > 0
      ? validBpmValues.reduce((sum, bpm) => {
          return sum + bpm;
        }, 0) / validBpmValues.length
      : 0;

  // Initialize counters and arrays
  const qualityScores: number[] = [];
  const depths: number[] = [];
  const rates: number[] = [];

  let fullRecoilCount = 0;
  let fullCompressionCount = 0;
  let idealRangeCount = 0;
  let perfectCompressionCount = 0;

  // Process each compression
  for (const compression of compressions) {
    // Use average BPM for normalization when BPM is nullish
    const effectiveBpm = compression.bpm && compression.bpm > 60 ? compression.bpm : averageBpm;

    // Calculate individual component scores
    const depthScore = getBandScore(compression.endDepthMm, IDEAL_DEPTH_MIN, IDEAL_DEPTH_MAX);

    const rateScore =
      effectiveBpm > 0 ? getBandScore(effectiveBpm, IDEAL_BPM_MIN, IDEAL_BPM_MAX) : 0;
    const recoilScore = compression.hasFullyRebounded ? 1 : 0;
    const compressionScore = compression.hasFullyCompressed ? 1 : 0;

    // Calculate weighted quality score
    const qualityScore =
      WEIGHTS.DEPTH * depthScore +
      WEIGHTS.RATE * rateScore +
      WEIGHTS.RECOIL * recoilScore +
      WEIGHTS.COMPRESSION * compressionScore;

    qualityScores.push(qualityScore);

    // Count compressions in ideal BPM range (using effective BPM)
    if (effectiveBpm >= IDEAL_BPM_MIN && effectiveBpm <= IDEAL_BPM_MAX) {
      idealRangeCount++;
    }

    // Count binary achievements
    if (compression.hasFullyRebounded) {
      fullRecoilCount++;
    }
    if (compression.hasFullyCompressed) {
      fullCompressionCount++;
    }

    // Count perfect compressions (all aspects ideal)
    if (isCompressionPerfect(compression, effectiveBpm)) {
      perfectCompressionCount++;
    }

    // Collect values for calculations
    depths.push(compression.endDepthMm);
    if (compression.bpm !== null) {
      rates.push(compression.bpm);
    } else if (effectiveBpm > 0) {
      // Include normalized BPM in rates for standard deviation calculation
      rates.push(effectiveBpm);
    }
  }

  const totalCompressions = compressions.length;

  // Calculate average quality score (0-1 range)
  const averageQuality =
    qualityScores.reduce((sum, score) => {
      return sum + score;
    }, 0) / qualityScores.length;

  // Calculate base score (0-850 points from average quality)
  const baseScore = 850 * averageQuality;

  // Perfect score bonus: only achievable if ALL compressions are perfect
  const perfectCompressionRate = perfectCompressionCount / totalCompressions;
  const isPerfectSession = perfectCompressionRate === 1.0;

  // Consistency metrics
  const depthStandardDeviation = calculateStandardDeviation(depths);
  const rateStandardDeviation = calculateStandardDeviation(rates);

  // Consistency bonus (0-100 points)
  // Rewards low variability in depth and rate
  const consistencyBonus =
    100 *
    (0.5 * clamp01((6 - depthStandardDeviation) / 6) +
      0.5 * clamp01((10 - rateStandardDeviation) / 10));

  // Perfect execution bonus (0-50 points)
  // Scales with percentage of perfect compressions
  const perfectionBonus = 50 * Math.pow(perfectCompressionRate, 2);

  // Calculate final score
  let finalScore = baseScore + consistencyBonus + perfectionBonus;

  // Only a perfect session (all compressions perfect) can reach MAX_SCORE
  if (isPerfectSession) {
    finalScore = MAX_SCORE;
  } else {
    // Cap at 999 if not perfect
    finalScore = Math.min(999, Math.round(finalScore));
  }

  // Calculate averages
  const finalAverageBpm =
    rates.length > 0
      ? rates.reduce((sum, rate) => {
          return sum + rate;
        }, 0) / rates.length
      : averageBpm; // Use the normalized average if no valid BPM values in rates
  const averageDepth =
    depths.reduce((sum, depth) => {
      return sum + depth;
    }, 0) / totalCompressions;

  return {
    score: finalScore,
    totalCompressions,
    totalFullCompressions: fullCompressionCount,
    totalFullRebounds: fullRecoilCount,
    compressionsOnBpmRange: idealRangeCount,
    averageBpm: finalAverageBpm,
    averageCompressionEndDepthMm: averageDepth,
  };
};
