import * as m from "drizzle-orm/mysql-core";

import { timestamps } from "../helpers/timestamps";
import { cprSessions } from "./cpr-sessions.model";

export const cprCompressions = m.mysqlTable("cpr_compressions", {
  id: m.int().primaryKey().autoincrement(),
  cprSessionId: m
    .int()
    .notNull()
    .references(() => cprSessions.id, { onDelete: "cascade" }),
  timestampMs: m.float(),
  startDepthMm: m.float().notNull(),
  endDepthMm: m.float().notNull(),
  ...timestamps,
});
