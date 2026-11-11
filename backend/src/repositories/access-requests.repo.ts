import { subDays } from "date-fns";
import { and, count, desc, eq, gte, lt, sql } from "drizzle-orm";

import {
  ACCESS_REQUEST_STATUSES,
  accessRequests,
  AccessRequestStatus,
  db,
  DbExecutor,
} from "../db";

/** A request nobody reviewed in this long is dropped; asking again files a new one. */
const PENDING_REQUEST_TTL_DAYS = 15;

const accessRequestColumns = {
  id: accessRequests.id,
  email: accessRequests.email,
  status: accessRequests.status,
  createdAt: accessRequests.createdAt,
};

export const AccessRequestsRepository = {
  /**
   * Files a request for an email with no active user. A new email starts
   * pending; one approved before (whose user was since revoked) goes back to
   * pending; a pending one is refreshed, so its 15 days start again; a
   * rejected one is left alone, so a rejection sticks. One atomic upsert, so
   * neither a concurrent request nor the stale cleanup can lose the filing.
   * Every condition reads the same for the old and the new status, so the
   * order MySQL assigns the columns in does not matter.
   *
   * Reports whether the filing put a new request in front of the admins: a
   * first filing or an approved one coming back. A refreshed pending request
   * or a sticky rejection is not news. The status is read just before the
   * upsert rather than inside it, since MySQL's affected-rows count cannot
   * tell a refresh from a re-queue; a filing racing with its own duplicate
   * costs at most one extra notice.
   */
  /**
   * The read and the upsert run in one transaction with the row (or, for a
   * new email, the index gap) locked, so two simultaneous filings serialize
   * and only the one that actually creates or re-queues the pending request
   * reports it as newly pending.
   */
  record: async (email: string) =>
    await db.transaction(async (tx) => {
      const [previous] = await tx
        .select({ status: accessRequests.status })
        .from(accessRequests)
        .where(eq(accessRequests.email, email))
        .for("update");
      const isRejected = sql`${accessRequests.status} = ${ACCESS_REQUEST_STATUSES.rejected}`;

      await tx
        .insert(accessRequests)
        .values({ email })
        .onDuplicateKeyUpdate({
          set: {
            status: sql`if(${accessRequests.status} = ${ACCESS_REQUEST_STATUSES.approved}, ${ACCESS_REQUEST_STATUSES.pending}, ${accessRequests.status})`,
            reviewedByUserId: sql`if(${isRejected}, ${accessRequests.reviewedByUserId}, null)`,
            reviewedAt: sql`if(${isRejected}, ${accessRequests.reviewedAt}, null)`,
            updatedAt: sql`if(${isRejected}, ${accessRequests.updatedAt}, current_timestamp)`,
          },
        });

      return {
        isNewlyPending:
          !previous || previous.status === ACCESS_REQUEST_STATUSES.approved,
      };
    }),

  countCreatedSince: async (since: Date) => {
    const [row] = await db
      .select({ total: count() })
      .from(accessRequests)
      .where(gte(accessRequests.createdAt, since));

    return row?.total ?? 0;
  },

  listPending: async () =>
    await db
      .select(accessRequestColumns)
      .from(accessRequests)
      .where(eq(accessRequests.status, ACCESS_REQUEST_STATUSES.pending))
      .orderBy(desc(accessRequests.createdAt), desc(accessRequests.id)),

  /**
   * Inside a transaction the row stays locked until it ends, so two reviews of
   * the same request run one after the other and the second sees the first.
   */
  getForReview: async (id: string, executor: DbExecutor) => {
    const [row] = await executor
      .select(accessRequestColumns)
      .from(accessRequests)
      .where(eq(accessRequests.id, id))
      .for("update");

    return row;
  },

  markReviewed: async (
    id: string,
    status: Exclude<AccessRequestStatus, "pending">,
    reviewedByUserId: string,
    executor: DbExecutor,
  ) => {
    await executor
      .update(accessRequests)
      .set({
        status,
        reviewedByUserId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(accessRequests.id, id));
  },

  /**
   * Counts from the last time the request went back to pending, not from when
   * it was first filed, so a re-queued request gets its full 15 days. Rejected
   * rows stay: they are what keeps a rejection from being filed again.
   */
  deleteStalePending: async () => {
    const cutoff = subDays(new Date(), PENDING_REQUEST_TTL_DAYS);

    await db
      .delete(accessRequests)
      .where(
        and(
          eq(accessRequests.status, ACCESS_REQUEST_STATUSES.pending),
          lt(
            sql`coalesce(${accessRequests.updatedAt}, ${accessRequests.createdAt})`,
            cutoff,
          ),
        ),
      );
  },
};
