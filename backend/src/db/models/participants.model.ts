import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import * as m from "drizzle-orm/mysql-core";
import { v4 } from "uuid";

import { timestamps } from "../helpers/timestamps";

export const participants = m.mysqlTable("participants", {
  id: m
    .varchar({ length: 36 })
    .primaryKey()
    .$defaultFn(() => v4()),
  firstName: m.text("first_name").notNull(),
  lastName: m.text("last_name"),
  email: m.text().notNull(),
  resultsEmailedAt: m.timestamp("results_emailed_at"),
  ...timestamps,
});

export type Participant = InferSelectModel<typeof participants>;
export type NewParticipant = InferInsertModel<typeof participants>;
