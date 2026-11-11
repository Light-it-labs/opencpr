import {
  and,
  AnyColumn,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lte,
  max,
  or,
  SQL,
} from "drizzle-orm";

import {
  AdminParticipantSortField,
  ExportAdminParticipantsQuery,
  ListAdminParticipantsQuery,
  SortDirection,
} from "@/schemas";
import { likeContains } from "@/utils";

import {
  cprSessions,
  db,
  locations,
  NewParticipant,
  Participant,
  participants,
} from "../db";

const orderBy = (
  column: SQL | SQL.Aliased | AnyColumn,
  direction: SortDirection,
) => (direction === "desc" ? desc(column) : asc(column));

/** A participant's play history, aggregated over the sessions joined to them. */
const sessionsCount = count(cprSessions.id);
const bestScore = max(cprSessions.score);
const lastPlayedAt = max(cprSessions.createdAt);

export const ParticipantsRepository = {
  /**
   * Participants with their play history, newest player first by default. A
   * left join so someone who registered but never finished a run still appears.
   * Limited to some locations, only runs there count, and only someone with at
   * least one of them appears.
   */
  listForAdmin: async (
    query: Omit<ListAdminParticipantsQuery, "locationId"> & {
      locationIds?: string[];
    },
  ) => {
    const { locationIds } = query;
    const sessionsJoin = and(
      eq(cprSessions.participantId, participants.id),
      locationIds ? inArray(cprSessions.locationId, locationIds) : undefined,
    );
    const search = query.search
      ? or(
          like(participants.firstName, likeContains(query.search)),
          like(participants.lastName, likeContains(query.search)),
          like(participants.email, likeContains(query.search)),
        )
      : undefined;
    const where = and(
      search,
      locationIds ? isNotNull(cprSessions.id) : undefined,
    );
    const { direction, field } = query.sort;

    // The aggregates are re-used rather than aliased: MySQL cannot order by an
    // alias inside an expression. Nullable ones sort empty last in both
    // directions, since "never played" is not the best nor the worst result.
    const sortOrder = {
      lastName: [
        orderBy(participants.lastName, direction),
        orderBy(participants.firstName, direction),
      ],
      firstName: [orderBy(participants.firstName, direction)],
      email: [orderBy(participants.email, direction)],
      sessionsCount: [orderBy(sessionsCount, direction)],
      bestScore: [asc(isNull(bestScore)), orderBy(bestScore, direction)],
      lastPlayedAt: [
        asc(isNull(lastPlayedAt)),
        orderBy(lastPlayedAt, direction),
      ],
      createdAt: [orderBy(participants.createdAt, direction)],
    } satisfies Record<AdminParticipantSortField, SQL[]>;

    const [items, [totalRow]] = await Promise.all([
      db
        .select({
          id: participants.id,
          firstName: participants.firstName,
          lastName: participants.lastName,
          email: participants.email,
          createdAt: participants.createdAt,
          sessionsCount,
          bestScore,
          lastPlayedAt,
        })
        .from(participants)
        .leftJoin(cprSessions, sessionsJoin)
        .where(where)
        .groupBy(participants.id)
        .orderBy(...sortOrder[field], orderBy(participants.id, direction))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      locationIds
        ? db
            .select({ total: countDistinct(participants.id) })
            .from(participants)
            .innerJoin(cprSessions, sessionsJoin)
            .where(search)
        : db.select({ total: count() }).from(participants).where(search),
    ]);

    return { items, total: totalRow?.total ?? 0 };
  },

  /**
   * Everyone who played a run matching the filters, with the history of those
   * runs only, most recent player first. The filters sit in the join condition
   * so a participant whose runs were all elsewhere, or outside the range, drops
   * out instead of appearing with empty figures.
   */
  listForExport: async (filters: ExportAdminParticipantsQuery) =>
    await db
      .select({
        firstName: participants.firstName,
        lastName: participants.lastName,
        email: participants.email,
        sessionsCount,
        bestScore,
        lastPlayedAt,
      })
      .from(participants)
      .innerJoin(
        cprSessions,
        and(
          eq(cprSessions.participantId, participants.id),
          filters.locationId
            ? eq(cprSessions.locationId, filters.locationId)
            : undefined,
          filters.dateFrom
            ? gte(cprSessions.createdAt, filters.dateFrom)
            : undefined,
          filters.dateTo
            ? lte(cprSessions.createdAt, filters.dateTo)
            : undefined,
        ),
      )
      .groupBy(participants.id)
      .orderBy(desc(lastPlayedAt), asc(participants.id)),

  get: async (id: Participant["id"]) =>
    await db.query.participants.findFirst({
      where: eq(participants.id, id),
    }),

  /** Display names for a handful of participants, for tables that list runs. */
  listNamesByIds: async (ids: Participant["id"][]) =>
    ids.length
      ? await db
          .select({
            id: participants.id,
            firstName: participants.firstName,
            lastName: participants.lastName,
          })
          .from(participants)
          .where(inArray(participants.id, ids))
      : [],

  /**
   * Where each of these participants has played: one row per participant and
   * location, most recent visit first. Disabled locations still count, so the
   * history keeps naming the venue after it closes. Undefined locationIds
   * reads every location.
   */
  listLocationsByParticipantIds: async (
    ids: Participant["id"][],
    locationIds?: string[],
  ) => {
    if (!ids.length) {
      return [];
    }

    const lastPlayedAtLocation = max(cprSessions.createdAt);

    return await db
      .select({
        participantId: cprSessions.participantId,
        id: locations.id,
        name: locations.name,
      })
      .from(cprSessions)
      .innerJoin(locations, eq(locations.id, cprSessions.locationId))
      .where(
        and(
          inArray(cprSessions.participantId, ids),
          locationIds
            ? inArray(cprSessions.locationId, locationIds)
            : undefined,
        ),
      )
      .groupBy(cprSessions.participantId, locations.id)
      .orderBy(desc(lastPlayedAtLocation), asc(locations.id));
  },

  // Sessions, compressions and session claims go with it via the FK cascades.
  remove: async (id: Participant["id"]) =>
    await db.delete(participants).where(eq(participants.id, id)),
  /**
   * Find-or-create, keyed on the email.
   *
   * The email is the only durable handle on a participant: the same person can
   * register again on another day, or replay at the booth, and each of those
   * arrives with its own registration id. Inserting blindly would scatter one
   * person across several rows and make "how many attempts has this person
   * made" unanswerable.
   *
   * The stored name is kept for a returning email: the phone form is public,
   * so whoever knows an address could otherwise rename that participant.
   */
  findOrCreateByEmail: async (participant: NewParticipant) => {
    const existing = await db.query.participants.findFirst({
      where: eq(participants.email, participant.email),
    });

    if (existing) {
      return { participant: existing, existed: true };
    }

    await db.insert(participants).values(participant);

    const createdParticipant = await db.query.participants.findFirst({
      where: eq(participants.email, participant.email),
      orderBy: (participants, { desc }) => [desc(participants.createdAt)],
    });

    if (!createdParticipant) {
      throw new Error("Failed to fetch created participant");
    }

    return { participant: createdParticipant, existed: false };
  },

  // One conditional update, so concurrent saves for the same participant cannot both send.
  reserveResultsEmail: async (id: Participant["id"], notSince: Date) => {
    const [result] = await db
      .update(participants)
      .set({ resultsEmailedAt: new Date() })
      .where(
        and(
          eq(participants.id, id),
          or(
            isNull(participants.resultsEmailedAt),
            lte(participants.resultsEmailedAt, notSince),
          ),
        ),
      );

    return result.affectedRows > 0;
  },
};
