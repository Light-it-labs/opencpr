import { createHash, randomBytes } from "node:crypto";
import { addDays, addMinutes, isAfter, subHours, subSeconds } from "date-fns";

import { env, logger } from "@/config";
import { UnauthorizedError } from "@/exceptions";
import { type User } from "@/models";
import {
  AccessRequestsRepository,
  AuthSessionsRepository,
  MagicLinksRepository,
  PasskeysRepository,
  UsersRepository,
} from "@/repositories";
import { AuthEmailService } from "@/services";

import { Sentry } from "../config/sentry";
import { AccessRequestsLogic } from "./admin/access-requests.logic";

/** A week keeps a user signed in between working sessions without going stale. */
const SESSION_TTL_DAYS = 7;

/** Long enough to reach the inbox, short enough that a leaked link dies fast. */
const MAGIC_LINK_TTL_MINUTES = 15;

/**
 * Each link supersedes the previous one, so without a per-user limit anyone
 * who knows a staff email could flood that inbox and keep killing the real
 * link from many IPs.
 */
const MAGIC_LINK_COOLDOWN_SECONDS = 60;
const MAGIC_LINKS_PER_HOUR = 5;

/** 48 random bytes is 384 bits: not guessable, and ~64 URL-safe characters. */
const MAGIC_LINK_TOKEN_BYTES = 48;

/** Only this digest is stored, so a database leak yields no usable links. */
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const userView = async (
  user: Pick<User, "id" | "email" | "name" | "role">,
) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  locationIds: await UsersRepository.getLocationScope(user),
  passkeysCount: await PasskeysRepository.countByUser(user.id),
});

export const AuthLogic = {
  /**
   * Access is by invite, so an unknown or revoked email gets no email and no
   * token, only an access request for an admin to review. The caller cannot
   * tell: the response is identical either way.
   */
  requestMagicLink: async (rawEmail: string) => {
    const email = rawEmail.trim().toLowerCase();
    const user = await UsersRepository.getByEmail(email);

    if (!user) {
      // A failure here must not turn into an error only unknown emails get.
      const filed = await AccessRequestsRepository.record(email).catch(
        (error: unknown) => {
          logger.error({
            action: "access_request_record_failed",
            error: error instanceof Error ? error.message : "unknown",
          });
          Sentry.captureException(error);
          return undefined;
        },
      );

      // Not awaited, like the magic link below: the admins' notices must not
      // make an unknown email take longer to answer than a known one. Only a
      // request that is new to the admins is announced, so asking again does
      // not nag them.
      if (filed?.isNewlyPending) {
        void AccessRequestsLogic.notifyAdmins({
          email,
          requestedAt: new Date(),
        });
      }
      return;
    }

    const now = new Date();
    const recent = await MagicLinksRepository.issuedSince(
      user.id,
      subHours(now, 1),
    );
    const isCoolingDown =
      recent.latestAt !== null &&
      isAfter(recent.latestAt, subSeconds(now, MAGIC_LINK_COOLDOWN_SECONDS));

    if (isCoolingDown || recent.total >= MAGIC_LINKS_PER_HOUR) {
      logger.info({ action: "magic_link_throttled", userId: user.id });
      return;
    }

    const token = randomBytes(MAGIC_LINK_TOKEN_BYTES).toString("base64url");
    const ttlMinutes = MAGIC_LINK_TTL_MINUTES;

    await MagicLinksRepository.issue({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: addMinutes(now, ttlMinutes),
    });

    // Not awaited: an invited and an unknown email must take the same time to
    // answer, or the delay itself says which is which. A delivery failure is
    // logged without its payload, which holds the link, and never surfaces.
    void AuthEmailService.sendMagicLink({
      to: user.email,
      ttlMinutes,
      url: `${env.ADMIN_APP_URL.replace(/\/+$/, "")}/login?token=${token}`,
    })
      .then(() => logger.info({ action: "magic_link_sent", userId: user.id }))
      .catch((error: unknown) => {
        logger.error({
          action: "magic_link_send_failed",
          userId: user.id,
          error: error instanceof Error ? error.message : "unknown",
        });
        Sentry.captureException(error);
      });
  },

  consumeMagicLink: async (token: string) => {
    const userId = await MagicLinksRepository.consume(hashToken(token));
    const user = userId ? await UsersRepository.getById(userId) : null;

    if (!user) {
      throw new UnauthorizedError("This link is invalid or has expired.");
    }

    const session = await AuthLogic.createSession(user.id);
    logger.info({ action: "login_magic_link", userId: user.id });

    return { ...session, user: await userView(user) };
  },

  createSession: async (userId: string) => {
    const expiresAt = addDays(new Date(), SESSION_TTL_DAYS);
    const sessionId = await AuthSessionsRepository.create({
      userId,
      expiresAt,
    });

    await UsersRepository.touchLastLogin(userId);

    return { sessionId, expiresAt };
  },

  logout: async (sessionId: string | undefined) => {
    if (sessionId) {
      await AuthSessionsRepository.delete(sessionId);
    }
  },

  me: userView,
};
