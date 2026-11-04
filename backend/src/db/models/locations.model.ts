import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import * as m from "drizzle-orm/mysql-core";
import { v4 } from "uuid";

import { timestamps } from "../helpers/timestamps";

export const locations = m.mysqlTable("locations", {
  id: m
    .varchar({ length: 36 })
    .primaryKey()
    .$defaultFn(() => v4()),
  name: m.text().notNull(),
  country: m.text().notNull(),
  city: m.text().notNull(),
  address: m.text().notNull(),
  startDate: m.timestamp("start_date").notNull(),
  endDate: m.timestamp("end_date"),
  // Daily opening hours in `timezone`; both null means open around the clock.
  opensAt: m.time("opens_at"),
  closesAt: m.time("closes_at"),
  timezone: m.varchar({ length: 64 }).notNull().default("UTC"),
  alertsEnabled: m.boolean("alerts_enabled").notNull().default(true),
  ...timestamps,
});

export type Location = InferSelectModel<typeof locations>;
export type NewLocation = InferInsertModel<typeof locations>;
