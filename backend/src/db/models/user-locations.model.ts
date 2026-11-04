import { InferSelectModel } from "drizzle-orm";
import * as m from "drizzle-orm/mysql-core";

import { locations } from "./locations.model";
import { users } from "./users.model";

/**
 * The locations a viewer may read. A viewer with no rows reads every
 * location, and an admin never has rows: admins always read everything.
 */
export const userLocations = m.mysqlTable(
  "user_locations",
  {
    userId: m
      .varchar({ length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    locationId: m
      .varchar({ length: 36 })
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
  },
  (table) => [m.primaryKey({ columns: [table.userId, table.locationId] })],
);

export type UserLocation = InferSelectModel<typeof userLocations>;
