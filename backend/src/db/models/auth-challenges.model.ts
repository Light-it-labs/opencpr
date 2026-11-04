import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import * as m from "drizzle-orm/mysql-core";
import { v4 } from "uuid";

import { timestamps } from "../helpers/timestamps";

export type AuthChallengeKind = "registration" | "login";

/**
 * A WebAuthn challenge awaiting its response. Kept server-side and deleted the
 * moment it is read, so a captured response cannot be replayed.
 */
export const authChallenges = m.mysqlTable("auth_challenges", {
  id: m
    .varchar({ length: 36 })
    .primaryKey()
    .$defaultFn(() => v4()),
  // Null for login: nobody is known until the credential identifies them.
  userId: m.varchar({ length: 36 }),
  kind: m.varchar({ length: 16 }).$type<AuthChallengeKind>().notNull(),
  challenge: m.text().notNull(),
  expiresAt: m.timestamp("expires_at").notNull(),
  ...timestamps,
});

export type AuthChallenge = InferSelectModel<typeof authChallenges>;
export type NewAuthChallenge = InferInsertModel<typeof authChallenges>;
