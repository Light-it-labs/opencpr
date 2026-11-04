import { isBefore, isPast, subMinutes } from "date-fns";
import { type NextFunction, type Response } from "express";

import { logger } from "@/config";
import { UnauthorizedError } from "@/exceptions";
import { AuthSessionsRepository, UsersRepository } from "@/repositories";
import { CookieService } from "@/services";
import { type AuthenticatedRequest } from "@/types";

import { Sentry } from "../config/sentry";

const LAST_SEEN_THROTTLE_MINUTES = 5;

const isLastSeenStale = (lastSeenAt: Date | null) =>
  !lastSeenAt ||
  isBefore(lastSeenAt, subMinutes(new Date(), LAST_SEEN_THROTTLE_MINUTES));

const touchLastSeen = (userId: string) => {
  void UsersRepository.touchLastSeen(userId).catch((error: unknown) =>
    logger.error({
      action: "last_seen_update_failed",
      userId,
      error: error instanceof Error ? error.message : "unknown",
    }),
  );
};

export const authGuard =
  () =>
  async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      const sessionId = CookieService.get(req);

      if (!sessionId) {
        throw new UnauthorizedError();
      }

      const session = await AuthSessionsRepository.get(sessionId);

      if (!session) {
        throw new UnauthorizedError();
      }

      // Expiry is enforced here rather than by a sweep, so a stale row cannot
      // authenticate even if nothing has cleaned it up yet.
      // A revoked user is cut off on their next request, not at session
      // expiry, and their session is dropped so it cannot linger.
      if (isPast(session.expiresAt) || session.user.deletedAt) {
        await AuthSessionsRepository.delete(session.id);
        throw new UnauthorizedError();
      }

      if (isLastSeenStale(session.user.lastSeenAt)) {
        touchLastSeen(session.user.id);
      }

      req.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        locationIds: await UsersRepository.getLocationScope(session.user),
      };
      Sentry.setUser({ id: session.user.id });

      next();
    } catch (e) {
      next(e);
    }
  };

/** For handlers behind authGuard(), where the user is always present. */
export const getUser = (req: AuthenticatedRequest) => {
  if (!req.user) {
    throw new UnauthorizedError();
  }

  return req.user;
};
