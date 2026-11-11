import * as m from "drizzle-orm/mysql-core";

import { timestamps } from "../helpers/timestamps";
import { locations } from "./locations.model";

/**
 * Latest known state of each booth, so a broken kiosk is visible without
 * someone walking past it.
 *
 * One row per kiosk, overwritten on every heartbeat. Keyed by an id the kiosk
 * generates and persists itself, because several machines can stand at one
 * location.
 */
export const kiosks = m.mysqlTable("kiosks", {
  kioskId: m.varchar("kiosk_id", { length: 36 }).primaryKey(),
  locationId: m
    .varchar("location_id", { length: 36 })
    .references(() => locations.id),
  /** Serial status the kiosk last observed, e.g. reading / no-signal. */
  serialStatus: m.varchar("serial_status", { length: 32 }),
  /**
   * When the sensor was last heard from. The port is only open during a run, so
   * this is deliberately "last known" rather than live.
   */
  serialOkAt: m.timestamp("serial_ok_at"),
  /**
   * Baseline the device reported, in mm. The only remote signal for mount drift:
   * a booth quietly reporting 118 instead of 132 is scoring everyone wrong.
   */
  baselineMm: m.float("baseline_mm"),
  /** Frontend build the kiosk is running, to spot one left on stale code. */
  buildId: m.varchar("build_id", { length: 64 }),
  tokenHash: m.varchar("token_hash", { length: 64 }).unique(),
  pairedAt: m.timestamp("paired_at"),
  ...timestamps,
});
