import { TZDate } from "@date-fns/tz";
import { UTCDate } from "@date-fns/utc";
import { format, isBefore } from "date-fns";

import { BadRequestError, NotFoundError } from "@/exceptions";
import { Location } from "@/models";
import { LocationsRepository } from "@/repositories";
import { CreateLocation, UpdateLocation } from "@/schemas";
import { toHourMinute } from "@/utils";

type StoredLocation = NonNullable<
  Awaited<ReturnType<typeof LocationsRepository.get>>
>;

/** MySQL returns `HH:mm:ss`; the API speaks the `HH:mm` it accepts. */
const toResponse = (location: StoredLocation) => ({
  ...location,
  opensAt: toHourMinute(location.opensAt),
  closesAt: toHourMinute(location.closesAt),
});

const CALENDAR_DAY = "yyyy-MM-dd";

/**
 * Whether the location's last day is over. `endDate` is a calendar day stored
 * as midnight UTC, so its UTC date is compared with today's date in the
 * location's own timezone; the last day itself still counts. No `endDate`
 * means open-ended.
 */
export const isEnded = (
  location: Pick<Location, "endDate" | "timezone">,
  now: Date,
): boolean => {
  if (!location.endDate) {
    return false;
  }

  const lastDay = format(new UTCDate(location.endDate), CALENDAR_DAY);
  const today = format(new TZDate(now, location.timezone), CALENDAR_DAY);

  return lastDay < today;
};

const findActive = async (id: string) => {
  const location = await LocationsRepository.getActive(id);

  if (!location) {
    throw new NotFoundError({ entity: "location", value: id });
  }

  return location;
};

export const LocationsLogic = {
  /** Kiosk setup: only locations a booth could still run at, today or later. */
  list: async () => {
    const now = new Date();
    const locations = await LocationsRepository.list();

    return locations
      .filter((location) => !isEnded(location, now))
      .map(toResponse);
  },

  /** Undefined ids lists every location. */
  listForAdmin: async (includeDisabled: boolean, ids?: string[]) => {
    const locations = await LocationsRepository.list({ ids, includeDisabled });

    return locations.map(toResponse);
  },

  create: async (data: CreateLocation) =>
    toResponse(await LocationsRepository.create(data)),

  update: async (id: string, data: UpdateLocation) => {
    const location = await findActive(id);

    // The schema can only compare the fields sent together; a lone endDate or
    // startDate has to be checked against the stored other half.
    const startDate = data.startDate ?? location.startDate;
    const endDate =
      data.endDate === undefined ? location.endDate : data.endDate;

    if (endDate && isBefore(endDate, startDate)) {
      throw new BadRequestError("endDate must not be before startDate");
    }

    // Same for the hours: one edge sent alone must still leave a full pair.
    const opensAt =
      data.opensAt === undefined ? location.opensAt : data.opensAt;
    const closesAt =
      data.closesAt === undefined ? location.closesAt : data.closesAt;

    if ((opensAt === null) !== (closesAt === null)) {
      throw new BadRequestError(
        "opensAt and closesAt must be set together or both cleared",
      );
    }

    if (opensAt !== null && toHourMinute(opensAt) === toHourMinute(closesAt)) {
      throw new BadRequestError("Opening and closing times must differ");
    }

    const updated = await LocationsRepository.update(id, data);

    if (!updated) {
      throw new NotFoundError({ entity: "location", value: id });
    }

    return toResponse(updated);
  },

  disable: async (id: string) => {
    await findActive(id);
    await LocationsRepository.disable(id);
  },
};
