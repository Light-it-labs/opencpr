import { InferSelectModel } from "drizzle-orm";
import z from "zod";

import { cprSessions, participants } from "@/models";

/** The challenge asks for 30; twice that leaves room without letting a request grow unbounded. */
const MAX_COMPRESSIONS_PER_RUN = 60;
const MAX_RUN_DURATION_MS = 10 * 60_000;
const MAX_DEPTH_MM = 200;

// The device reports measurements only. Rate, full compression and full recoil
// are derived in session-scoring, so firmware and API cannot hold different
// thresholds and past sessions can be re-scored when the model changes.
const compressionSchema = z.object({
  timestampMs: z.number().nonnegative().max(MAX_RUN_DURATION_MS),
  startDepthMm: z.number().min(0).max(MAX_DEPTH_MM),
  endDepthMm: z.number().min(0).max(MAX_DEPTH_MM),
});

// This endpoint is open to any booth, so only fields the kiosk owns are listed:
// the row id, timestamps and scores are the server's. Unknown keys are dropped
// rather than rejected, so runs queued by older kiosk builds still save. The
// participant is never set by the caller: it is linked from the phone claim.
export const createCprSessionSchema = z.object({
  publicId: z.string().min(1).max(36),
  registrationId: z.string().max(36).nullish(),
  locationId: z.string().max(36),
  kioskId: z.string().max(36).nullish(),
  buildId: z.string().max(64).nullish(),
  compressions: z
    .array(compressionSchema)
    .max(MAX_COMPRESSIONS_PER_RUN)
    .default([]),
});

/**
 * Letters in any script plus the punctuation real names use. ’ is listed
 * because phone keyboards turn a typed apostrophe into it.
 */
const PERSON_NAME_PATTERN = /^(?=.*\p{L})[\p{L}\p{M} '’.-]+$/u;

const personNameSchema = z
  .string()
  .trim()
  .min(2)
  .regex(
    PERSON_NAME_PATTERN,
    "Use letters, spaces, apostrophes, hyphens or periods only",
  );

/** Submitted from the participant's phone after scanning the kiosk QR. */
export const claimSessionSchema = z.object({
  firstName: personNameSchema,
  lastName: personNameSchema,
  email: z.email(),
});

/** Reported by each booth so a broken one is visible without walking to it. */
export const kioskHeartbeatSchema = z.object({
  locationId: z.string().max(36).nullish(),
  /** Last serial status the kiosk observed, e.g. reading / no-signal. */
  serialStatus: z.string().max(32).nullish(),
  /** When the sensor was last heard from; the port is only open during a run. */
  serialOkAt: z.coerce.date().nullish(),
  /** Device baseline in mm — the only remote signal for mount drift. */
  baselineMm: z.number().nullish(),
  buildId: z.string().max(64).nullish(),
});

export const kioskIdParamSchema = z.object({
  kioskId: z.string().min(1).max(36),
});

export const publicIdParamSchema = z.object({
  publicId: z.string().min(1).max(36),
});

export const magicLinkRequestSchema = z.object({
  email: z.email(),
});

export const magicLinkVerifySchema = z.object({
  token: z.string().min(1),
});

/**
 * The WebAuthn response is only checked to be an object here: the library
 * validates its structure and signatures, and duplicating that would drift.
 */
const webauthnResponseSchema = z.record(z.string(), z.unknown());

export const passkeyRegisterSchema = z.object({
  name: z.string().trim().max(255).optional(),
  response: webauthnResponseSchema,
});

export const passkeyLoginVerifySchema = z.object({
  challengeId: z.uuid(),
  response: webauthnResponseSchema,
});

/** Only the part of an assertion response the sign-in checks itself. */
export const webauthnAssertionSchema = z.object({
  userHandle: z.string().optional(),
});

export type CprCompression = z.infer<typeof compressionSchema>;
export type CprSession = InferSelectModel<typeof cprSessions>;
export type CreateCprSession = z.infer<typeof createCprSessionSchema>;
export type Participant = InferSelectModel<typeof participants>;
export type ClaimSession = z.infer<typeof claimSessionSchema>;
export type KioskHeartbeat = z.infer<typeof kioskHeartbeatSchema>;
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;
export type MagicLinkVerify = z.infer<typeof magicLinkVerifySchema>;
export type PasskeyRegister = z.infer<typeof passkeyRegisterSchema>;
export type PasskeyLoginVerify = z.infer<typeof passkeyLoginVerifySchema>;
export type WebauthnAssertion = z.infer<typeof webauthnAssertionSchema>;
