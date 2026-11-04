import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import * as m from "drizzle-orm/mysql-core";

import { timestamps } from "../helpers/timestamps";
import { users } from "./users.model";

/**
 * Only the sha256 of the token is stored, so a database leak cannot be turned
 * into working sign-in links. usedAt makes each link single-use.
 */
export const magicLinks = m.mysqlTable("magic_links", {
  id: m.int().primaryKey().autoincrement(),
  userId: m
    .varchar({ length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: m.varchar({ length: 64 }).notNull().unique(),
  expiresAt: m.timestamp("expires_at").notNull(),
  usedAt: m.timestamp("used_at"),
  ...timestamps,
});

export type MagicLink = InferSelectModel<typeof magicLinks>;
export type NewMagicLink = InferInsertModel<typeof magicLinks>;
