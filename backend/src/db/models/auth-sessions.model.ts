import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import * as m from "drizzle-orm/mysql-core";
import { v4 } from "uuid";

import { timestamps } from "../helpers/timestamps";
import { users } from "./users.model";

/**
 * Who is signed in to the portal. The id is the cookie value, so it must be
 * unguessable: a random uuid, never anything derived from the account.
 */
export const authSessions = m.mysqlTable(
  "auth_sessions",
  {
    id: m
      .varchar({ length: 36 })
      .primaryKey()
      .$defaultFn(() => v4()),
    userId: m
      .varchar({ length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: m.timestamp("expires_at").notNull(),
    ...timestamps,
  },
  (table) => [m.index("auth_sessions_expires_at_idx").on(table.expiresAt)],
);

export type AuthSession = InferSelectModel<typeof authSessions>;
export type NewAuthSession = InferInsertModel<typeof authSessions>;
