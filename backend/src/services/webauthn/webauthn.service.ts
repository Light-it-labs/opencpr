import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from "@simplewebauthn/server";
import { milliseconds } from "date-fns";

import { env } from "@/config";

const RP_NAME = "CPR Admin";
const CEREMONY_TIMEOUT_MS = milliseconds({ minutes: 1 });

/** ES256 and RS256: what platform authenticators and security keys all offer. */
const SUPPORTED_ALGORITHM_IDS = [-7, -257];

/** A browser reports origins without a path or trailing slash. */
const EXPECTED_ORIGIN = new URL(env.ADMIN_APP_URL).origin;

export type RegistrationOptionsInput = {
  userId: string;
  userName: string;
  userDisplayName: string;
  excludeCredentials: { id: string; transports?: string[] }[];
};

export type VerifyRegistrationInput = {
  response: Record<string, unknown>;
  expectedChallenge: string;
};

export type VerifyAuthenticationInput = VerifyRegistrationInput & {
  credential: WebAuthnCredential;
};

/**
 * Passkeys are discoverable (resident) and always user-verified: the device
 * itself answers "who is signing in" and proves it is the owner, so no
 * username or password is needed on top.
 */
export const WebAuthnService = {
  registrationOptions: async ({
    excludeCredentials,
    userDisplayName,
    userId,
    userName,
  }: RegistrationOptionsInput) =>
    await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: env.ADMIN_RP_ID,
      userName,
      userDisplayName,
      // Copied into a plain ArrayBuffer-backed array, which is what the library
      // types demand of the encoder's output.
      userID: Uint8Array.from(new TextEncoder().encode(userId)),
      attestationType: "none",
      timeout: CEREMONY_TIMEOUT_MS,
      excludeCredentials,
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
      supportedAlgorithmIDs: SUPPORTED_ALGORITHM_IDS,
    }),

  /**
   * The body is validated only loosely at the edge; the library checks the
   * rest and rejects anything malformed, so the cast stays in this one place.
   */
  verifyRegistration: async ({
    expectedChallenge,
    response,
  }: VerifyRegistrationInput) =>
    await verifyRegistrationResponse({
      response: response as unknown as RegistrationResponseJSON,
      expectedChallenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: env.ADMIN_RP_ID,
      requireUserVerification: true,
      supportedAlgorithmIDs: SUPPORTED_ALGORITHM_IDS,
    }),

  /** No allowCredentials: nobody is identified until the credential answers. */
  authenticationOptions: async () =>
    await generateAuthenticationOptions({
      rpID: env.ADMIN_RP_ID,
      userVerification: "required",
      timeout: CEREMONY_TIMEOUT_MS,
    }),

  verifyAuthentication: async ({
    credential,
    expectedChallenge,
    response,
  }: VerifyAuthenticationInput) =>
    await verifyAuthenticationResponse({
      response: response as unknown as AuthenticationResponseJSON,
      expectedChallenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: env.ADMIN_RP_ID,
      credential,
      requireUserVerification: true,
    }),
};
