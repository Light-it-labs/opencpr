import { z } from "zod";

import { locationSchema } from "../locations";

// Raw measurement only. Rate, full compression and full recoil are derived
// from these in session-scoring, so the firmware and the app cannot disagree.
export const cprCompressionSchema = z.object({
  timestampMs: z.number().min(0),
  startDepthMm: z.number().min(0),
  endDepthMm: z.number().min(0),
});

export const cprSessionSchema = z.object({
  /** Identifies this single run. */
  publicId: z.string(),
  /** Identifies the person, and is what the registration QR encodes. */
  registrationId: z.string().nullish(),
  /** Which booth recorded the run, and the frontend build it was running. */
  kioskId: z.string().nullish(),
  buildId: z.string().nullish(),
  locationId: z.lazy(() => {
    return locationSchema.shape.id;
  }),
  compressions: z.array(cprCompressionSchema).default([]),
  /** How this run placed against everyone who played at this location today. */
  position: z.number().nullable(),
  percentile: z.number().nullish(),
  participantsToday: z.number().nullish(),
});

export const createCprSessionSchema = cprSessionSchema.pick({
  publicId: true,
  registrationId: true,
  locationId: true,
  kioskId: true,
  buildId: true,
  compressions: true,
});

export const createdCprSessionSchema = cprSessionSchema.pick({
  publicId: true,
  position: true,
  percentile: true,
  participantsToday: true,
});

/**
 * Mirrors the API's rule so a rejected name is outlined on the form instead of
 * failing on submit. ’ is listed because phone keyboards turn a typed
 * apostrophe into it.
 */
const personNameSchema = z
  .string()
  .trim()
  .min(2)
  .regex(/^(?=.*\p{L})[\p{L}\p{M} '’.-]+$/u);

/** What the participant submits from their phone after scanning the QR. */
export const claimSessionSchema = z.object({
  firstName: personNameSchema,
  lastName: personNameSchema,
  email: z.email(),
});

/** Whether a phone registration has landed for a given session. */
export const sessionClaimSchema = z.object({
  claimed: z.boolean(),
});

export const claimResultSchema = z.object({
  claimed: z.boolean(),
});
