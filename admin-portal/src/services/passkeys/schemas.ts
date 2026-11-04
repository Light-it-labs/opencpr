import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { z } from "zod";

const hasChallenge = (value: unknown) => {
  return typeof value === "object" && value !== null && "challenge" in value;
};

export const passkeySchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.iso.datetime().nullable(),
  lastUsedAt: z.iso.datetime().nullable(),
});

export const passkeyResponseSchema = z.object({ data: passkeySchema });

export const passkeysResponseSchema = z.object({ data: z.array(passkeySchema) });

export const passkeyLoginOptionsResponseSchema = z.object({
  data: z.object({
    challengeId: z.string(),
    options: z.custom<PublicKeyCredentialRequestOptionsJSON>(hasChallenge),
  }),
});

export const passkeyRegistrationOptionsResponseSchema = z.object({
  data: z.custom<PublicKeyCredentialCreationOptionsJSON>(hasChallenge),
});
