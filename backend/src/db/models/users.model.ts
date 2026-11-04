import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import * as m from "drizzle-orm/mysql-core";
import { v4 } from "uuid";

import { timestamps } from "../helpers/timestamps";

/**
 * What a portal user may do: admins manage everything, viewers only read. A
 * plain object rather than a TypeScript enum, like the other vocabularies.
 */
export const USER_ROLES = {
  admin: "admin",
  viewer: "viewer",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * The invite list: a row here is the only way to sign in to the portal. A
 * revoked user keeps the row (deletedAt) so the email stays reserved and
 * sessions and passkeys can be audited, but can no longer authenticate.
 */
export const users = m.mysqlTable("users", {
  id: m
    .varchar({ length: 36 })
    .primaryKey()
    .$defaultFn(() => v4()),
  email: m.varchar({ length: 255 }).notNull().unique(),
  name: m.varchar({ length: 255 }),
  role: m
    .varchar({ length: 16 })
    .$type<UserRole>()
    .notNull()
    .default(USER_ROLES.viewer),
  invitedByUserId: m.varchar({ length: 36 }),
  lastLoginAt: m.timestamp("last_login_at"),
  lastSeenAt: m.timestamp("last_seen_at"),
  ...timestamps,
});

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
