import { and, eq, inArray, isNull } from "drizzle-orm";

import { CreateLocation, UpdateLocation } from "@/schemas";

import { db, locations, type DbExecutor } from "../db";

export const LocationsRepository = {
  /**
   * Disabled locations are left out by default: this backs the kiosk setup
   * screen, which must never offer a booth a location that was retired.
   */
  list: async ({
    ids,
    includeDisabled = false,
  }: { ids?: string[]; includeDisabled?: boolean } = {}) =>
    await db.query.locations.findMany({
      where: and(
        includeDisabled ? undefined : isNull(locations.deletedAt),
        ids ? inArray(locations.id, ids) : undefined,
      ),
    }),

  /** Which of these ids name a location, disabled ones included. */
  listExistingIds: async (ids: string[], executor: DbExecutor = db) => {
    if (!ids.length) {
      return [];
    }

    const rows = await executor
      .select({ id: locations.id })
      .from(locations)
      .where(inArray(locations.id, ids));

    return rows.map((row) => row.id);
  },

  get: async (id?: string, executor: DbExecutor = db) =>
    await executor.query.locations.findFirst({
      where: id ? eq(locations.id, id) : undefined,
    }),

  /** Like get, but a disabled location is treated as missing. */
  getActive: async (id: string) =>
    await db.query.locations.findFirst({
      where: and(eq(locations.id, id), isNull(locations.deletedAt)),
    }),

  create: async (data: CreateLocation) => {
    const [inserted] = await db.insert(locations).values(data).$returningId();

    if (!inserted) {
      throw new Error("Location insert returned no id");
    }

    const location = await LocationsRepository.get(inserted.id);

    if (!location) {
      throw new Error("Failed to fetch created location");
    }

    return location;
  },

  update: async (id: string, data: UpdateLocation) => {
    await db
      .update(locations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(locations.id, id));

    return await LocationsRepository.get(id);
  },

  disable: async (id: string) => {
    await db
      .update(locations)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(locations.id, id));
  },
};
