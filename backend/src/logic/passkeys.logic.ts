import { addMinutes } from "date-fns";

import { logger } from "@/config";
import { NotFoundError, UnprocessableEntityError } from "@/exceptions";
import { type Passkey } from "@/models";
import {
  AuthChallengesRepository,
  PasskeysRepository,
  UsersRepository,
} from "@/repositories";
import {
  PasskeyLoginVerify,
  PasskeyRegister,
  webauthnAssertionSchema,
} from "@/schemas";
import { WebAuthnService } from "@/services";
import { type AuthenticatedUser } from "@/types";

import { AuthLogic } from "./auth.logic";

const CHALLENGE_TTL_MINUTES = 5;
const DEFAULT_PASSKEY_NAME = "Passkey";

/**
 * Every ceremony failure reads the same. A caller learning whether the
 * challenge expired, the credential was unknown or the signature was wrong
 * would be learning how to probe the system.
 */
const CEREMONY_FAILED_CODE = "passkey_ceremony_failed";
const loginFailed = () =>
  new UnprocessableEntityError(
    "Start the sign-in again.",
    CEREMONY_FAILED_CODE,
  );
const registrationFailed = () =>
  new UnprocessableEntityError(
    "Start the enrolment again.",
    CEREMONY_FAILED_CODE,
  );

/**
 * The client only ever sees the vague 422, so the library's reason is kept
 * here for whoever investigates. Only its message is logged: the response
 * payload is attacker-controlled and the challenge is a secret.
 */
const logCeremonyFailure = (userId: string | undefined) => (error: unknown) => {
  logger.warn({
    action: "passkey_ceremony_failed",
    userId,
    error: error instanceof Error ? error.message : "unknown",
  });

  return null;
};

const parseTransports = (raw: string | null): string[] | undefined => {
  if (!raw) return undefined;

  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter((t): t is string => typeof t === "string")
      : undefined;
  } catch {
    return undefined;
  }
};

const passkeyView = (passkey: Passkey) => ({
  id: passkey.id,
  name: passkey.name,
  createdAt: passkey.createdAt,
  lastUsedAt: passkey.lastUsedAt,
});

export const PasskeysLogic = {
  registrationOptions: async (user: AuthenticatedUser) => {
    await AuthChallengesRepository.deleteExpired();

    const existing = await PasskeysRepository.listByUser(user.id);

    const options = await WebAuthnService.registrationOptions({
      userId: user.id,
      userName: user.email,
      userDisplayName: user.name ?? user.email,
      // Stops the same authenticator being enrolled twice.
      excludeCredentials: existing.map((passkey) => ({
        id: passkey.credentialId,
        transports: parseTransports(passkey.transports),
      })),
    });

    // A restarted enrolment replaces the abandoned one.
    await AuthChallengesRepository.deleteForUserKind(user.id, "registration");
    await AuthChallengesRepository.create({
      userId: user.id,
      kind: "registration",
      challenge: options.challenge,
      expiresAt: addMinutes(new Date(), CHALLENGE_TTL_MINUTES),
    });

    return options;
  },

  register: async (user: AuthenticatedUser, data: PasskeyRegister) => {
    const challenge = await AuthChallengesRepository.pullForUserKind(
      user.id,
      "registration",
    );

    if (!challenge) throw registrationFailed();

    const verification = await WebAuthnService.verifyRegistration({
      response: data.response,
      expectedChallenge: challenge.challenge,
    }).catch(logCeremonyFailure(user.id));

    if (!verification?.verified) throw registrationFailed();

    const { credential, credentialBackedUp, credentialDeviceType } =
      verification.registrationInfo;

    if (await PasskeysRepository.getByCredentialId(credential.id)) {
      throw registrationFailed();
    }

    const created = await PasskeysRepository.create({
      userId: user.id,
      name: data.name || DEFAULT_PASSKEY_NAME,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports
        ? JSON.stringify(credential.transports)
        : null,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    });

    logger.info({ action: "passkey_registered", userId: user.id });

    return passkeyView(created);
  },

  list: async (user: AuthenticatedUser) => {
    const passkeys = await PasskeysRepository.listByUser(user.id);

    return passkeys.map(passkeyView);
  },

  remove: async (user: AuthenticatedUser, id: number) => {
    const removed = await PasskeysRepository.deleteOwned(user.id, id);

    // Same answer for someone else's passkey as for a missing one.
    if (!removed) throw new NotFoundError({ entity: "passkey", value: id });

    logger.info({ action: "passkey_removed", userId: user.id });
  },

  loginOptions: async () => {
    await AuthChallengesRepository.deleteExpired();

    const options = await WebAuthnService.authenticationOptions();
    const challengeId = await AuthChallengesRepository.create({
      userId: null,
      kind: "login",
      challenge: options.challenge,
      expiresAt: addMinutes(new Date(), CHALLENGE_TTL_MINUTES),
    });

    return { challengeId, options };
  },

  login: async ({ challengeId, response }: PasskeyLoginVerify) => {
    // Pulled first: the challenge is spent even if everything after fails.
    const challenge = await AuthChallengesRepository.pull(challengeId);

    if (challenge?.kind !== "login") throw loginFailed();

    const credentialId = response.id;

    if (typeof credentialId !== "string") throw loginFailed();

    const passkey = await PasskeysRepository.getByCredentialId(credentialId);

    if (!passkey) throw loginFailed();

    const user = await UsersRepository.getById(passkey.userId);

    if (!user) throw loginFailed();

    // The authenticator reports whose credential it believes it is; when it
    // does, it must agree with who the credential is stored under.
    const assertion = webauthnAssertionSchema.safeParse(response.response);

    if (
      assertion.success &&
      assertion.data.userHandle !== undefined &&
      assertion.data.userHandle !== Buffer.from(user.id).toString("base64url")
    ) {
      throw loginFailed();
    }

    const verification = await WebAuthnService.verifyAuthentication({
      response,
      expectedChallenge: challenge.challenge,
      credential: {
        id: passkey.credentialId,
        publicKey: new Uint8Array(Buffer.from(passkey.publicKey, "base64url")),
        counter: passkey.counter,
        transports: parseTransports(passkey.transports),
      },
    }).catch(logCeremonyFailure(passkey.userId));

    if (!verification?.verified) throw loginFailed();

    const advanced = await PasskeysRepository.updateAfterLogin(
      passkey.id,
      passkey.counter,
      verification.authenticationInfo.newCounter,
    );

    if (!advanced) throw loginFailed();

    const session = await AuthLogic.createSession(user.id);
    logger.info({ action: "login_passkey", userId: user.id });

    return { ...session, user: await AuthLogic.me(user) };
  },
};
