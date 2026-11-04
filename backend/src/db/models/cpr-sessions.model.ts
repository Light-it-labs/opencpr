import * as m from "drizzle-orm/mysql-core";

import { timestamps } from "../helpers/timestamps";
import { locations } from "./locations.model";
import { participants } from "./participants.model";

export const cprSessions = m.mysqlTable(
  "cpr_sessions",
  {
    id: m.int().primaryKey().autoincrement(),
    /**
     * Minted on the kiosk before play and encoded into the registration QR, so
     * the QR needs no server round-trip. Unique, so a kiosk retrying a save
     * gets the stored run back instead of a second row.
     */
    publicId: m.varchar("public_id", { length: 36 }).notNull().unique(),
    /**
     * The registration this run belongs to — the value encoded in the QR.
     *
     * Separate from publicId because one person can have several attempts: they
     * register once, then every replay is its own session row carrying the same
     * registrationId. Counting rows per registrationId gives attempts per person.
     */
    registrationId: m.varchar("registration_id", { length: 36 }),
    locationId: m
      .varchar({ length: 36 })
      .notNull()
      .references(() => locations.id),
    /**
     * Which booth recorded this run, and which frontend build it was running.
     *
     * Nullable because runs predating these columns cannot be attributed, and
     * because a location can hold several kiosks — locationId alone cannot say
     * which machine produced a run, so a booth scoring everyone wrong is
     * invisible without this.
     */
    kioskId: m.varchar("kiosk_id", { length: 36 }),
    buildId: m.varchar("build_id", { length: 64 }),
    participantId: m
      .varchar({ length: 36 })
      .references(() => participants.id, { onDelete: "cascade" }),
    totalCompressions: m.int().default(0).notNull(),
    totalFullCompressions: m.int().default(0).notNull(),
    totalFullRebounds: m.int().default(0).notNull(),
    averageCompressionEndDepthMm: m.float().default(0).notNull(),
    compressionsOnBpmRange: m.int().default(0).notNull(),
    averageBpm: m.float().default(0).notNull(),
    score: m.float().notNull().default(0),
    /**
     * Time from the first to the last compression, stored at insert so the
     * statistics never scan `cpr_compressions`. Null when the run has no
     * compressions, and for runs recorded before the column existed that the
     * backfill could not fill.
     */
    durationMs: m.int("duration_ms"),
    ...timestamps,
  },
  (table) => [
    m
      .index("cpr_sessions_location_id_created_at_idx")
      .on(table.locationId, table.createdAt),
  ],
);
