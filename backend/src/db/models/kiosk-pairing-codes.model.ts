import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import * as m from "drizzle-orm/mysql-core";
import { v4 } from "uuid";

import { timestamps } from "../helpers/timestamps";
import { locations } from "./locations.model";
import { users } from "./users.model";

export const kioskPairingCodes = m.mysqlTable("kiosk_pairing_codes", {
  id: m
    .varchar({ length: 36 })
    .primaryKey()
    .$defaultFn(() => v4()),
  codeHash: m.varchar("code_hash", { length: 64 }).notNull().unique(),
  locationId: m
    .varchar("location_id", { length: 36 })
    .notNull()
    .references(() => locations.id),
  createdByUserId: m
    .varchar("created_by_user_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  expiresAt: m.timestamp("expires_at").notNull(),
  usedAt: m.timestamp("used_at"),
  ...timestamps,
});

export type KioskPairingCode = InferSelectModel<typeof kioskPairingCodes>;
export type NewKioskPairingCode = InferInsertModel<typeof kioskPairingCodes>;
