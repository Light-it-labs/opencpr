import * as m from "drizzle-orm/mysql-core";

import { timestamps } from "../helpers/timestamps";
import { participants } from "./participants.model";

/**
 * A registration submitted from a participant's phone.
 *
 * Keyed by the registration id the QR encodes rather than by session id, for
 * phone form and the kiosk's session upload race each other: on a flaky venue
 * network the phone regularly wins. Storing the claim independently lets either
 * side arrive first without losing the link.
 */
export const sessionClaims = m.mysqlTable("session_claims", {
  publicId: m.varchar("public_id", { length: 36 }).primaryKey(),
  participantId: m
    .varchar("participant_id", { length: 36 })
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  ...timestamps,
});
