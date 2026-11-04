import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import * as m from "drizzle-orm/mysql-core";

import { timestamps } from "../helpers/timestamps";

/**
 * What the health job last concluded about a booth. A plain object rather than
 * a TypeScript enum, like the other state vocabularies in this codebase.
 */
export const KIOSK_ALERT_STATES = {
  ok: "ok",
  offline: "offline",
  sensor: "sensor",
} as const;

export type KioskAlertState =
  (typeof KIOSK_ALERT_STATES)[keyof typeof KIOSK_ALERT_STATES];

/**
 * The state each booth was in when the health job last ran, which is what lets
 * the next run tell a change from a booth that has simply stayed broken. One
 * row per kiosk, keyed by the kiosk's own id; no foreign key, so a retired
 * booth's history never blocks anything.
 */
export const kioskAlerts = m.mysqlTable("kiosk_alerts", {
  kioskId: m.varchar("kiosk_id", { length: 36 }).primaryKey(),
  state: m.varchar({ length: 16 }).$type<KioskAlertState>().notNull(),
  ...timestamps,
});

export type KioskAlert = InferSelectModel<typeof kioskAlerts>;
export type NewKioskAlert = InferInsertModel<typeof kioskAlerts>;
