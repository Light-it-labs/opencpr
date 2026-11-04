import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import * as m from "drizzle-orm/mysql-core";

import { timestamps } from "../helpers/timestamps";
import { users } from "./users.model";

/** One WebAuthn credential. Binary values are kept as base64url strings. */
export const passkeys = m.mysqlTable(
  "passkeys",
  {
    id: m.int().primaryKey().autoincrement(),
    userId: m
      .varchar({ length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: m.varchar({ length: 255 }).notNull(),
    credentialId: m.varchar({ length: 512 }).notNull().unique(),
    publicKey: m.text().notNull(),
    // Signature counter: a value that fails to advance signals a cloned key.
    counter: m.bigint({ mode: "number" }).notNull().default(0),
    /** JSON array of transport hints, replayed to the browser on sign-in. */
    transports: m.text(),
    deviceType: m.varchar({ length: 32 }),
    backedUp: m.boolean().notNull().default(false),
    lastUsedAt: m.timestamp("last_used_at"),
    ...timestamps,
  },
  (table) => [
    m
      .index("passkeys_user_id_created_at_idx")
      .on(table.userId, table.createdAt),
  ],
);

export type Passkey = InferSelectModel<typeof passkeys>;
export type NewPasskey = InferInsertModel<typeof passkeys>;
