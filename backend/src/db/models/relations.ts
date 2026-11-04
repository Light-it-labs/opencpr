import { relations } from "drizzle-orm";

import { cprCompressions } from "./cpr-compressions.model";
import { cprSessions } from "./cpr-sessions.model";
import { locations } from "./locations.model";
import { participants } from "./participants.model";

export const locationsRelations = relations(locations, ({ many }) => ({
  cprSessions: many(cprSessions),
}));

export const participantsRelations = relations(participants, ({ many }) => ({
  cprSessions: many(cprSessions),
}));

export const cprSessionsRelations = relations(cprSessions, ({ many, one }) => ({
  location: one(locations, {
    fields: [cprSessions.locationId],
    references: [locations.id],
  }),
  participant: one(participants, {
    fields: [cprSessions.participantId],
    references: [participants.id],
  }),
  compressions: many(cprCompressions),
}));

export const cprCompressionsRelations = relations(
  cprCompressions,
  ({ one }) => ({
    cprSession: one(cprSessions, {
      fields: [cprCompressions.cprSessionId],
      references: [cprSessions.id],
    }),
  }),
);
