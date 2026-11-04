import { NotFoundError } from "@/exceptions";
import { CprSessionsRepository } from "@/repositories";
import { ListAdminSessionsQuery } from "@/schemas";
import { AuthenticatedUser } from "@/types";
import { paginate } from "@/utils";

import { scopeLocationIds } from "./location-scope";

export const SessionsLogic = {
  list: async (
    user: AuthenticatedUser,
    { locationId, ...query }: ListAdminSessionsQuery,
  ) => {
    const { items, total } = await CprSessionsRepository.listForAdmin({
      ...query,
      locationIds: scopeLocationIds(user, locationId),
    });

    return paginate(items, query, total);
  },

  /** A run outside the user's locations is reported as missing, not forbidden. */
  get: async (user: AuthenticatedUser, id: number) => {
    const session = await CprSessionsRepository.getForAdmin(id);
    const locationIds = scopeLocationIds(user);

    if (
      !session ||
      (locationIds && !locationIds.some((id) => id === session.location?.id))
    ) {
      throw new NotFoundError({ entity: "session", value: id });
    }

    const compressions = await CprSessionsRepository.listCompressions(id);

    return { ...session, compressions };
  },
};
