import { ForbiddenError } from "@/exceptions";
import { AuthenticatedUser } from "@/types";

/**
 * The locations a read covers: the one asked for, else the user's own, else
 * undefined for every location. A location outside the user's own is a 403.
 */
export const scopeLocationIds = (
  user: AuthenticatedUser,
  locationId?: string,
): string[] | undefined => {
  const requested = locationId?.toLowerCase();

  if (!user.locationIds) {
    return requested ? [requested] : undefined;
  }

  if (!requested) {
    return user.locationIds;
  }

  if (!user.locationIds.includes(requested)) {
    throw new ForbiddenError("You cannot view this location.");
  }

  return [requested];
};
