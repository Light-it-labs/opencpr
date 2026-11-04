import { and, asc, eq, inArray, isNull } from "drizzle-orm";

import { env } from "@/config";

import {
  authSessions,
  db,
  DbExecutor,
  NewUser,
  User,
  USER_ROLES,
  userLocations,
  UserRole,
  users,
} from "../db";

const userColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  invitedByUserId: users.invitedByUserId,
  lastLoginAt: users.lastLoginAt,
  lastSeenAt: users.lastSeenAt,
  createdAt: users.createdAt,
  deletedAt: users.deletedAt,
};

export const UsersRepository = {
  /** Revoked users are invisible here, so they can never be signed in. */
  getByEmail: async (email: string) =>
    await db.query.users.findFirst({
      where: and(eq(users.email, email), isNull(users.deletedAt)),
    }),

  getById: async (id: string) =>
    await db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
    }),

  /**
   * The email is unique across revoked rows too, so a revoked bootstrap user
   * is never restored, and concurrent boots cannot create two.
   */
  ensureBootstrap: async () => {
    await db
      .insert(users)
      .ignore()
      .values({ email: env.BOOTSTRAP_ADMIN_EMAIL, role: USER_ROLES.admin });
  },

  touchLastLogin: async (id: string) => {
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  },

  touchLastSeen: async (id: string) => {
    await db
      .update(users)
      .set({ lastSeenAt: new Date() })
      .where(eq(users.id, id));
  },

  /** Active users only: a revoked admin must not keep getting portal notices. */
  listActiveByRole: async (role: UserRole) =>
    await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(and(eq(users.role, role), isNull(users.deletedAt)))
      .orderBy(asc(users.email)),

  /** Everyone, revoked included, so the user page can show who lost access. */
  listAll: async () =>
    await db
      .select(userColumns)
      .from(users)
      .orderBy(asc(users.createdAt), asc(users.email)),

  /** Unlike getByEmail this sees revoked users: an invite has to find them. */
  findAnyByEmail: async (email: string, executor: DbExecutor = db) =>
    await executor.query.users.findFirst({ where: eq(users.email, email) }),

  getSummary: async (id: string, executor: DbExecutor = db) => {
    const [row] = await executor
      .select(userColumns)
      .from(users)
      .where(eq(users.id, id));

    return row;
  },

  create: async (
    data: Pick<NewUser, "email" | "name" | "role" | "invitedByUserId">,
    executor: DbExecutor = db,
  ) => {
    const [inserted] = await executor.insert(users).values(data).$returningId();

    if (!inserted) {
      throw new Error("User insert returned no id");
    }

    return inserted.id;
  },

  /** Clears the revoke; the email and past passkeys come back with it. */
  reinstate: async (
    id: string,
    data: Pick<NewUser, "name" | "role" | "invitedByUserId">,
    executor: DbExecutor = db,
  ) => {
    await executor
      .update(users)
      .set({ ...data, deletedAt: null, updatedAt: new Date() })
      .where(eq(users.id, id));
  },

  updateRole: async (id: string, role: UserRole, executor: DbExecutor = db) => {
    await executor
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id));
  },

  /** One row per user and location they are limited to. */
  listLocationIds: async (userIds: string[], executor: DbExecutor = db) =>
    userIds.length
      ? await executor
          .select({
            userId: userLocations.userId,
            locationId: userLocations.locationId,
          })
          .from(userLocations)
          .where(inArray(userLocations.userId, userIds))
          .orderBy(asc(userLocations.locationId))
      : [],

  /**
   * The locations this user may read, or null for every location: admins
   * always read everything, and a viewer with no rows is not limited.
   */
  getLocationScope: async ({ id, role }: Pick<User, "id" | "role">) => {
    if (role === USER_ROLES.admin) {
      return null;
    }

    const rows = await UsersRepository.listLocationIds([id]);

    return rows.length ? rows.map((row) => row.locationId) : null;
  },

  replaceLocations: async (
    userId: string,
    locationIds: string[],
    executor: DbExecutor = db,
  ) => {
    await executor
      .delete(userLocations)
      .where(eq(userLocations.userId, userId));

    if (locationIds.length) {
      await executor
        .insert(userLocations)
        .values(locationIds.map((locationId) => ({ userId, locationId })));
    }
  },

  /**
   * Sessions go in the same transaction: a revoke that kept them would make a
   * later reinvite bring every unexpired session back to life.
   */
  revoke: async (id: string) => {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, id));
      await tx.delete(authSessions).where(eq(authSessions.userId, id));
    });
  },
};
