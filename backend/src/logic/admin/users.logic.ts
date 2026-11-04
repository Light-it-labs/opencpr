import { BadRequestError, ConflictError, NotFoundError } from "@/exceptions";
import { USER_ROLES } from "@/models";
import { LocationsRepository, UsersRepository } from "@/repositories";
import { InviteUser, UpdateUser } from "@/schemas";
import { AuthenticatedUser } from "@/types";

import { db, type DbExecutor } from "../../db";

/** MySQL ER_DUP_ENTRY: a unique key already holds the value. */
const DUPLICATE_ENTRY_ERRNO = 1062;

const isDuplicateEntry = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "errno" in error &&
  error.errno === DUPLICATE_ENTRY_ERRNO;

const assertKnownLocations = async (
  locationIds: string[],
  executor: DbExecutor = db,
) => {
  const known = await LocationsRepository.listExistingIds(
    locationIds,
    executor,
  );

  if (known.length !== locationIds.length) {
    throw new BadRequestError("Unknown location in locationIds.");
  }
};

/** An empty list means every location, which is all an admin ever has. */
const withLocationIds = async <T extends { id: string }>(
  users: T[],
  executor: DbExecutor = db,
) => {
  const rows = await UsersRepository.listLocationIds(
    users.map((user) => user.id),
    executor,
  );

  return users.map((user) => ({
    ...user,
    locationIds: rows
      .filter((row) => row.userId === user.id)
      .map((row) => row.locationId),
  }));
};

const getSummary = async (id: string, executor: DbExecutor = db) => {
  const user = await UsersRepository.getSummary(id, executor);

  if (!user) {
    return undefined;
  }

  const [withLocations] = await withLocationIds([user], executor);

  return withLocations;
};

export const UsersLogic = {
  list: async () => await withLocationIds(await UsersRepository.listAll()),

  /**
   * Invites by adding the row; no email goes out. The invitee requests their
   * own magic link, which only works for an email on this list. Pass a
   * transaction to make the invite part of a larger change.
   */
  invite: async (
    inviter: AuthenticatedUser,
    { email, locationIds = [], name, role }: InviteUser,
    executor?: DbExecutor,
  ) => {
    await assertKnownLocations(locationIds, executor);

    const existing = await UsersRepository.findAnyByEmail(email, executor);

    if (existing && !existing.deletedAt) {
      throw new ConflictError({ entity: "user", key: "email", value: email });
    }

    let id: string;

    if (existing) {
      // The email column is unique, so a revoked user cannot be re-inserted:
      // bringing them back reuses the row.
      await UsersRepository.reinstate(
        existing.id,
        { name, role, invitedByUserId: inviter.id },
        executor,
      );
      id = existing.id;
    } else {
      // Two invites for one email can both pass the lookup above; the unique
      // key settles which one wins.
      id = await UsersRepository.create(
        { email, name, role, invitedByUserId: inviter.id },
        executor,
      ).catch((error: unknown) => {
        throw isDuplicateEntry(error)
          ? new ConflictError({ entity: "user", key: "email", value: email })
          : error;
      });
    }

    // A reinstated user gets this invite's locations, like its role.
    await UsersRepository.replaceLocations(id, locationIds, executor);

    const user = await getSummary(id, executor);

    if (!user) {
      throw new Error("Failed to fetch invited user");
    }

    return user;
  },

  /**
   * Like revoke, never on yourself: the last admin could lock everyone out,
   * and a user could widen their own access. Becoming an admin clears the
   * locations, since an admin always reads everything.
   */
  update: async (
    current: AuthenticatedUser,
    id: string,
    { locationIds, role }: UpdateUser,
  ) => {
    if (id === current.id) {
      throw new BadRequestError(
        role === undefined
          ? "You cannot change your own locations."
          : "You cannot change your own role.",
      );
    }

    const user = await UsersRepository.getById(id);

    if (!user) {
      throw new NotFoundError({ entity: "user", value: id });
    }

    const nextRole = role ?? user.role;

    if (nextRole === USER_ROLES.admin && locationIds?.length) {
      throw new BadRequestError(
        "An admin always sees every location; send no locationIds.",
      );
    }

    if (locationIds) {
      await assertKnownLocations(locationIds);
    }

    await db.transaction(async (tx) => {
      if (role) {
        await UsersRepository.updateRole(id, role, tx);
      }

      if (nextRole === USER_ROLES.admin) {
        await UsersRepository.replaceLocations(id, [], tx);
      } else if (locationIds) {
        await UsersRepository.replaceLocations(id, locationIds, tx);
      }
    });

    const updated = await getSummary(id);

    if (!updated) {
      throw new Error("Failed to fetch updated user");
    }

    return updated;
  },

  revoke: async (current: AuthenticatedUser, id: string) => {
    if (id === current.id) {
      throw new BadRequestError("You cannot revoke your own access.");
    }

    const user = await UsersRepository.getById(id);

    if (!user) {
      throw new NotFoundError({ entity: "user", value: id });
    }

    await UsersRepository.revoke(id);
  },
};
