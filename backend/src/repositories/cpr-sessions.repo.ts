import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  like,
  lte,
  min,
  or,
  sql,
} from "drizzle-orm";
import { MySqlColumn } from "drizzle-orm/mysql-core";

import {
  AdminSessionSortField,
  CprSession,
  CreateCprSession,
  ListAdminSessionsQuery,
  PerformanceStatsQuery,
  StatsQuery,
} from "@/schemas";
import { isDuplicateEntry, likeContains } from "@/utils";

import {
  cprCompressions,
  cprSessions,
  db,
  locations,
  participants,
  sessionClaims,
} from "../db";

/** One session with who played it and where, as the admin tables show it. */
const adminSessionColumns = {
  session: cprSessions,
  location: { id: locations.id, name: locations.name },
  participant: {
    id: participants.id,
    firstName: participants.firstName,
    lastName: participants.lastName,
    email: participants.email,
  },
};

const adminSessionSortColumns: Record<AdminSessionSortField, MySqlColumn[]> = {
  createdAt: [cprSessions.createdAt],
  score: [cprSessions.score],
  totalCompressions: [cprSessions.totalCompressions],
  averageBpm: [cprSessions.averageBpm],
  averageCompressionEndDepthMm: [cprSessions.averageCompressionEndDepthMm],
  location: [locations.name],
  participant: [participants.lastName, participants.firstName],
};

const flattenAdminSession = <T extends { session: object }>({
  session,
  ...relations
}: T) => ({ ...session, ...relations });

const createdBetween = ({
  dateFrom,
  dateTo,
}: Pick<StatsQuery, "dateFrom" | "dateTo">) => [
  dateFrom ? gte(cprSessions.createdAt, dateFrom) : undefined,
  dateTo ? lte(cprSessions.createdAt, dateTo) : undefined,
];

/** The locations a read is limited to; undefined reads every location. */
type LocationScope = { locationIds?: string[] };

type ScopedStatsQuery = Omit<StatsQuery, "locationId"> & LocationScope;

const inLocations = ({ locationIds }: LocationScope) =>
  locationIds ? inArray(cprSessions.locationId, locationIds) : undefined;

const statsWhere = (query: ScopedStatsQuery) =>
  and(inLocations(query), ...createdBetween(query));

export const CprSessionsRepository = {
  /**
   * The admin table: every run, newest first by default, with player and venue attached.
   * Search has to reach the participant's columns, so the participant join is part of the
   * filter and the count must run against the same joins.
   */
  listForAdmin: async (
    query: Omit<ListAdminSessionsQuery, "locationId"> & LocationScope,
  ) => {
    const where = and(
      inLocations(query),
      ...createdBetween(query),
      query.search
        ? or(
            like(participants.firstName, likeContains(query.search)),
            like(participants.lastName, likeContains(query.search)),
            like(participants.email, likeContains(query.search)),
          )
        : undefined,
    );

    const [rows, [totalRow]] = await Promise.all([
      db
        .select(adminSessionColumns)
        .from(cprSessions)
        .leftJoin(locations, eq(locations.id, cprSessions.locationId))
        .leftJoin(participants, eq(participants.id, cprSessions.participantId))
        .where(where)
        // id breaks ties so pages do not shuffle runs sharing a value.
        .orderBy(
          ...[...adminSessionSortColumns[query.sort.field], cprSessions.id].map(
            (column) =>
              query.sort.direction === "desc" ? desc(column) : asc(column),
          ),
        )
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
      db
        .select({ total: count() })
        .from(cprSessions)
        .leftJoin(participants, eq(participants.id, cprSessions.participantId))
        .where(where),
    ]);

    return {
      items: rows.map(flattenAdminSession),
      total: totalRow?.total ?? 0,
    };
  },

  getForAdmin: async (id: CprSession["id"]) => {
    const [row] = await db
      .select(adminSessionColumns)
      .from(cprSessions)
      .leftJoin(locations, eq(locations.id, cprSessions.locationId))
      .leftJoin(participants, eq(participants.id, cprSessions.participantId))
      .where(eq(cprSessions.id, id));

    return row ? flattenAdminSession(row) : undefined;
  },

  listCompressions: async (cprSessionId: CprSession["id"]) =>
    await db
      .select({
        id: cprCompressions.id,
        timestampMs: cprCompressions.timestampMs,
        startDepthMm: cprCompressions.startDepthMm,
        endDepthMm: cprCompressions.endDepthMm,
      })
      .from(cprCompressions)
      .where(eq(cprCompressions.cprSessionId, cprSessionId))
      .orderBy(asc(cprCompressions.timestampMs), asc(cprCompressions.id)),

  /**
   * The projection the performance statistics aggregate in memory: one row per
   * run with the figures the scorer stored, plus the venue's name and timezone
   * so hours can be bucketed in local time. Oldest first so attempts are
   * already in order.
   */
  listForPerformance: async (
    filters: Omit<PerformanceStatsQuery, "locationId"> & LocationScope,
  ) =>
    await db
      .select({
        id: cprSessions.id,
        participantId: cprSessions.participantId,
        registrationId: cprSessions.registrationId,
        locationId: cprSessions.locationId,
        createdAt: cprSessions.createdAt,
        score: cprSessions.score,
        averageCompressionEndDepthMm: cprSessions.averageCompressionEndDepthMm,
        averageBpm: cprSessions.averageBpm,
        totalCompressions: cprSessions.totalCompressions,
        totalFullCompressions: cprSessions.totalFullCompressions,
        totalFullRebounds: cprSessions.totalFullRebounds,
        compressionsOnBpmRange: cprSessions.compressionsOnBpmRange,
        durationMs: cprSessions.durationMs,
        location: { name: locations.name, timezone: locations.timezone },
      })
      .from(cprSessions)
      .innerJoin(locations, eq(locations.id, cprSessions.locationId))
      .where(statsWhere(filters))
      .orderBy(asc(cprSessions.createdAt), asc(cprSessions.id)),

  /**
   * The projection the dashboard statistics aggregate in memory: one row per
   * run with its score, who played it and the venue's name and timezone, so
   * days can be bucketed in local time. The caller widens the date window by a
   * day on each side, since a run's local day may differ from its UTC day.
   */
  listForStats: async (query: ScopedStatsQuery) =>
    await db
      .select({
        id: cprSessions.id,
        participantId: cprSessions.participantId,
        locationId: cprSessions.locationId,
        createdAt: cprSessions.createdAt,
        score: cprSessions.score,
        location: { name: locations.name, timezone: locations.timezone },
      })
      .from(cprSessions)
      .innerJoin(locations, eq(locations.id, cprSessions.locationId))
      .where(statsWhere(query)),

  /**
   * When the first run in scope was recorded, so an open-ended stats range can
   * start there. Undefined when nothing has been recorded yet.
   */
  statsFirstCreatedAt: async (scope: LocationScope) => {
    const [row] = await db
      .select({ createdAt: min(cprSessions.createdAt) })
      .from(cprSessions)
      .where(inLocations(scope));

    return row?.createdAt ?? undefined;
  },

  get: async (id: CprSession["id"]) =>
    await db.query.cprSessions.findFirst({
      where: eq(cprSessions.id, id),
      with: { location: true },
    }),

  /** Runs at this location since `since` that scored higher, plus one. */
  getSessionPosition: async (
    { locationId, score }: Pick<CprSession, "locationId" | "score">,
    since: Date,
  ) => {
    const result = await db
      .select({ count: count() })
      .from(cprSessions)
      .where(
        and(
          gt(cprSessions.score, score),
          eq(cprSessions.locationId, locationId),
          gte(cprSessions.createdAt, since),
        ),
      );

    return (result[0]?.count ?? 0) + 1;
  },

  /**
   * Runs recorded at this location since `since`, the start of its local day,
   * which is what a placement is measured against. Scoped to the day because a
   * booth's field resets with the event: being told you beat everyone from
   * three venues ago is not the same claim as beating the queue behind you.
   */
  countToday: async (locationId: CprSession["locationId"], since: Date) => {
    const result = await db
      .select({ count: count() })
      .from(cprSessions)
      .where(
        and(
          eq(cprSessions.locationId, locationId),
          gte(cprSessions.createdAt, since),
        ),
      );

    return result[0]?.count ?? 0;
  },

  getByPublicId: async (publicId: CprSession["publicId"]) =>
    await db.query.cprSessions.findFirst({
      where: eq(cprSessions.publicId, publicId),
      with: { location: true },
    }),

  /** How many runs this person has done, including the one just stored. */
  countAttempts: async (filter: {
    participantId?: string | null;
    registrationId?: string | null;
  }) => {
    const where = filter.participantId
      ? eq(cprSessions.participantId, filter.participantId)
      : filter.registrationId
        ? eq(cprSessions.registrationId, filter.registrationId)
        : null;

    // An anonymous run has nothing to group by, so it is always a first attempt.
    if (!where) {
      return 1;
    }

    const result = await db
      .select({ count: count() })
      .from(cprSessions)
      .where(where);

    return result[0]?.count ?? 1;
  },

  /**
   * The registration a participant submitted from their phone, if any. Joined
   * with participants for the first name the kiosk greets a replay with.
   */
  getClaim: async (publicId: CprSession["publicId"]) => {
    const result = await db
      .select({
        publicId: sessionClaims.publicId,
        participantId: sessionClaims.participantId,
        createdAt: sessionClaims.createdAt,
        updatedAt: sessionClaims.updatedAt,
        deletedAt: sessionClaims.deletedAt,
        firstName: participants.firstName,
        email: participants.email,
      })
      .from(sessionClaims)
      .leftJoin(participants, eq(sessionClaims.participantId, participants.id))
      .where(eq(sessionClaims.publicId, publicId));

    return result[0];
  },

  /**
   * Stores a registration's claim unless one is already there, and answers
   * with the participant it belongs to. A stored claim is never reassigned.
   */
  saveClaim: async (
    publicId: CprSession["publicId"],
    participantId: string,
  ) => {
    await db
      .insert(sessionClaims)
      .values({ publicId, participantId })
      .onDuplicateKeyUpdate({
        set: { publicId: sql`${sessionClaims.publicId}` },
      });

    const [stored] = await db
      .select({ participantId: sessionClaims.participantId })
      .from(sessionClaims)
      .where(eq(sessionClaims.publicId, publicId));

    return stored?.participantId;
  },

  /**
   * The most recent run recorded under a registration, if any.
   *
   * Used when the phone form lands after the run: that form is the first moment
   * we know who to send results to, and the run they just finished is the one
   * they are waiting on.
   */
  getLatestByRegistration: async (registrationId: string) =>
    await db.query.cprSessions.findFirst({
      where: eq(cprSessions.registrationId, registrationId),
      orderBy: [desc(cprSessions.createdAt)],
      with: { location: true },
    }),

  /**
   * Applies a registration to every run that already carries its id and has
   * no participant yet; a run already filed under someone is left alone.
   */
  linkParticipantByRegistration: async (
    registrationId: string,
    participantId: string,
  ) => {
    await db
      .update(cprSessions)
      .set({ participantId })
      .where(
        and(
          eq(cprSessions.registrationId, registrationId),
          isNull(cprSessions.participantId),
        ),
      );
  },

  /**
   * A `publicId` that is already stored is a kiosk retrying a save: the stored
   * run comes back with `created: false` and nothing is written.
   */
  create: async (data: CreateCprSession) => {
    const { compressions, ...sessionData } = data;

    return await db.transaction(async (tx) => {
      const result = await tx
        .insert(cprSessions)
        .values(sessionData)
        .$returningId()
        .catch((error: unknown) => {
          if (isDuplicateEntry(error)) {
            return null;
          }
          throw error;
        });

      if (!result) {
        const stored = await tx.query.cprSessions.findFirst({
          where: eq(cprSessions.publicId, sessionData.publicId),
        });

        if (!stored) {
          throw new Error("Failed to fetch the stored CPR session");
        }

        return { session: stored, created: false };
      }

      const insertedId = result[0]?.id;

      if (!insertedId) {
        throw new Error("Failed to create CPR session");
      }

      if (compressions?.length) {
        const compressionsToCreate = compressions.map((compression) => ({
          ...compression,
          cprSessionId: insertedId,
        }));

        await tx.insert(cprCompressions).values(compressionsToCreate);
      }

      const session = await tx.query.cprSessions.findFirst({
        where: eq(cprSessions.id, insertedId),
      });

      if (!session) {
        throw new Error("Failed to fetch created session");
      }

      return { session, created: true };
    });
  },
};
