/**
 * The CPR guideline the booth scores against, in one place so the scorer and
 * the admin statistics cannot disagree on what "in range" means.
 */
export const CPR_GUIDELINE = {
  /** Compression depth considered full, in mm, both bounds inclusive. */
  depthMinMm: 50,
  depthMaxMm: 60,
  /** Compression rate considered on target, in compressions per minute. */
  bpmMin: 100,
  bpmMax: 120,
  /** Chest is considered fully released at or below this residual depth. */
  fullRecoilMaxDepthMm: 5,
  /** A rate at or below this is a pause or sensor noise, not a rhythm. */
  minValidBpm: 60,
} as const;
