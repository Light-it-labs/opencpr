import { env, logger } from "@/config";
import { ConflictError, NotFoundError } from "@/exceptions";
import { AuthLogic } from "@/logic";
import {
  ACCESS_REQUEST_STATUSES,
  AccessRequestStatus,
  USER_ROLES,
} from "@/models";
import { AccessRequestsRepository, UsersRepository } from "@/repositories";
import { ApproveAccessRequest } from "@/schemas";
import { EmailService } from "@/services";
import { AuthenticatedUser } from "@/types";

import { Sentry } from "../../config/sentry";
import { db, type DbExecutor } from "../../db";
import { UsersLogic } from "./users.logic";

/** Locks the request and lets it through only while nobody reviewed it. */
const lockPending = async (id: string, executor: DbExecutor) => {
  const request = await AccessRequestsRepository.getForReview(id, executor);

  if (!request) {
    throw new NotFoundError({ entity: "access request", value: id });
  }

  if (request.status !== ACCESS_REQUEST_STATUSES.pending) {
    throw new ConflictError({
      message: `This access request was already ${request.status}.`,
    });
  }

  return request;
};

const review = async (
  reviewer: AuthenticatedUser,
  id: string,
  status: Exclude<AccessRequestStatus, "pending">,
  executor: DbExecutor,
) => {
  const request = await lockPending(id, executor);
  await AccessRequestsRepository.markReviewed(
    id,
    status,
    reviewer.id,
    executor,
  );

  return { ...request, status };
};

export const AccessRequestsLogic = {
  list: async () => await AccessRequestsRepository.listPending(),

  /**
   * One queued email per active admin, pointing at the users page where the
   * pending requests are listed; there is no per-request route. Nothing is
   * sent when nobody is left to review, and nothing here can fail the request
   * itself: the caller does not even await it.
   */
  notifyAdmins: async ({
    email,
    requestedAt,
  }: {
    email: string;
    requestedAt: Date;
  }) => {
    try {
      const admins = await UsersRepository.listActiveByRole(USER_ROLES.admin);

      if (admins.length === 0) {
        logger.info({ action: "access_request_notice_skipped_no_admins" });
        return;
      }

      const url = `${env.ADMIN_APP_URL.replace(/\/+$/, "")}/users`;
      const outcomes = await Promise.all(
        admins.map(
          async (admin) =>
            await EmailService.sendAccessRequestNotice({
              to: admin.email,
              requesterEmail: email,
              requestedAt: requestedAt.toISOString(),
              url,
            }),
        ),
      );
      const queued = outcomes.filter(Boolean).length;

      logger.info({
        action: "access_request_notice_queued",
        queued,
        failed: admins.length - queued,
      });
    } catch (error) {
      logger.error({
        detail: "Error notifying admins of a new access request",
        error,
      });
      Sentry.captureException(error);
    }
  },

  /**
   * Invites the email through the regular invite, so a revoked user comes
   * back on the same row, and an active one is a 409. The user and the review
   * commit together; the magic link goes out only after both are saved.
   */
  approve: async (
    reviewer: AuthenticatedUser,
    id: string,
    { locationIds, role }: ApproveAccessRequest,
  ) => {
    const approved = await db.transaction(async (tx) => {
      const reviewed = await review(
        reviewer,
        id,
        ACCESS_REQUEST_STATUSES.approved,
        tx,
      );
      await UsersLogic.invite(
        reviewer,
        { email: reviewed.email, locationIds, role },
        tx,
      );

      return reviewed;
    });

    // The same path as signing in, so the link, its expiry and the delivery
    // logging cannot drift from the regular one. The approval is already
    // saved, so a failure here is logged rather than reported: the person can
    // still ask for a link from the login page.
    await AuthLogic.requestMagicLink(approved.email).catch((error: unknown) => {
      logger.error({
        action: "access_request_magic_link_failed",
        accessRequestId: approved.id,
        error: error instanceof Error ? error.message : "unknown",
      });
      Sentry.captureException(error);
    });

    return approved;
  },

  reject: async (reviewer: AuthenticatedUser, id: string) =>
    await db.transaction(
      async (tx) =>
        await review(reviewer, id, ACCESS_REQUEST_STATUSES.rejected, tx),
    ),
};
