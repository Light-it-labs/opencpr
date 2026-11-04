import { z } from "zod";

/**
 * Wire protocol with the compression sensor. One JSON object per line.
 *
 * The device reports measurements only — timestamps and millimeters. Whether a
 * compression was deep enough, released fully, or at the right rate is decided
 * in session-scoring, so the two halves of the system cannot disagree.
 */
const compressionFrameSchema = z.object({
  type: z.literal("compression"),
  timestampMs: z.number().min(0),
  startDepthMm: z.number().min(0),
  endDepthMm: z.number().min(0),
});

/** Sent twice a second so silence is distinguishable from a dead link. */
const heartbeatFrameSchema = z.object({
  type: z.literal("heartbeat"),
  sensorOk: z.boolean(),
  depthMm: z.number().optional(),
});

/** Emitted after boot and after any recalibration. */
const readyFrameSchema = z.object({
  type: z.literal("ready"),
  baselineMm: z.number(),
  /**
   * False when the baseline failed its own sanity check, so every depth derived
   * from it is suspect. Optional so an older board still parses; absent means
   * the device predates the flag and its baseline is taken at face value.
   */
  baselineOk: z.boolean().optional(),
  /**
   * Stable ID burned into the board, so the kiosk is recognized by its hardware
   * rather than by whichever browser storage it happens to run in. Optional so
   * an older board still parses; absent means the kiosk keeps its minted ID.
   */
  deviceId: z.string().max(36).optional(),
});

const errorFrameSchema = z.object({
  type: z.literal("error"),
  /**
   * "sensor" means ranging is broken and depths cannot be trusted.
   * "calibration" means the device is fine but a baseline request was refused;
   * the previous baseline is still in force. Optional so an older board still
   * parses — an unknown or missing code is treated as the more serious case.
   */
  code: z.enum(["sensor", "calibration"]).optional(),
  message: z.string(),
});

export const serialFrameSchema = z.discriminatedUnion("type", [
  compressionFrameSchema,
  heartbeatFrameSchema,
  readyFrameSchema,
  errorFrameSchema,
]);

export type SerialFrame = z.infer<typeof serialFrameSchema>;

/** Single characters the host sends back to the device. */
export const SERIAL_COMMANDS = {
  /** Clear compression tracking between participants. */
  resetSession: "R",
  /** Re-measure the resting baseline. Chest must be untouched. */
  recalibrate: "C",
} as const;
