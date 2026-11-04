import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import * as m from "drizzle-orm/mysql-core";
import { v4 } from "uuid";

import { timestamps } from "../helpers/timestamps";

/**
 * Where a request to join the portal stands. A plain object rather than a
 * TypeScript enum, like the other vocabularies.
 */
export const ACCESS_REQUEST_STATUSES = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
} as const;

export type AccessRequestStatus =
  (typeof ACCESS_REQUEST_STATUSES)[keyof typeof ACCESS_REQUEST_STATUSES];

/**
 * Someone without an active account asked for a magic link. Kept apart from
 * users on purpose: nothing here can sign in until an admin approves it, which
 * goes through the regular invite. One row per email, so asking again never
 * piles up duplicates, and a rejection sticks.
 */
export const accessRequests = m.mysqlTable("access_requests", {
  id: m
    .varchar({ length: 36 })
    .primaryKey()
    .$defaultFn(() => v4()),
  email: m.varchar({ length: 255 }).notNull().unique(),
  status: m
    .varchar({ length: 16 })
    .$type<AccessRequestStatus>()
    .notNull()
    .default(ACCESS_REQUEST_STATUSES.pending),
  reviewedByUserId: m.varchar({ length: 36 }),
  reviewedAt: m.timestamp("reviewed_at"),
  ...timestamps,
});

export type AccessRequest = InferSelectModel<typeof accessRequests>;
export type NewAccessRequest = InferInsertModel<typeof accessRequests>;
