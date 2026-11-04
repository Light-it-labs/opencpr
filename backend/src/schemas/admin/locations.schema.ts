import { UTCDate } from "@date-fns/utc";
import { isBefore } from "date-fns";
import { createInsertSchema } from "drizzle-zod";
import z from "zod";

import { locations } from "@/models";

const CALENDAR_DAY_LENGTH = "yyyy-MM-dd".length;

/**
 * Location dates are calendar days. Accept `yyyy-MM-dd` or a full ISO datetime
 * and keep the day as written by the sender, stored as midnight UTC, so the
 * sender's timezone offset can never shift the event to the previous day.
 */
const calendarDay = z
  .union([z.iso.date(), z.iso.datetime({ offset: true })])
  .transform((value) => new UTCDate(value.slice(0, CALENDAR_DAY_LENGTH)));

const hourMinute = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm");

// Intl is the source of truth for what TZDate can resolve; an unknown zone
// would silently turn every date computed from it into an Invalid Date.
const isKnownTimezone = (timeZone: string): boolean => {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });

    return true;
  } catch {
    return false;
  }
};

const timezone = z
  .string()
  .max(64)
  .refine(isKnownTimezone, "Unknown IANA timezone");

const locationFields = createInsertSchema(locations)
  .pick({ name: true, country: true, city: true, address: true })
  .extend({
    name: z.string().trim().min(2),
    country: z.string().trim().min(1),
    city: z.string().trim().min(1),
    address: z.string().trim().min(3),
    startDate: calendarDay,
    endDate: calendarDay.nullish(),
    opensAt: hourMinute.nullish(),
    closesAt: hourMinute.nullish(),
    timezone,
    alertsEnabled: z.boolean(),
  });

type LocationDates = {
  startDate?: Date;
  endDate?: Date | null;
};

const endsAfterStart = (data: LocationDates): boolean =>
  !data.startDate || !data.endDate || !isBefore(data.endDate, data.startDate);

type LocationHours = {
  opensAt?: string | null;
  closesAt?: string | null;
};

/** Hours are a pair: a window with only one edge has no meaning. */
const hoursComplete = (data: LocationHours): boolean =>
  (data.opensAt == null) === (data.closesAt == null);

/**
 * On a patch an omitted edge means "keep the stored one", which only the logic
 * can see, so the pair is checked here only when both edges are sent.
 */
const sentHoursComplete = (data: LocationHours): boolean =>
  data.opensAt === undefined ||
  data.closesAt === undefined ||
  hoursComplete(data);

const hoursIssue = {
  message: "opensAt and closesAt must be set together or both cleared",
  path: ["closesAt"],
};

/** An empty window would mean the booth is never monitored, silently. */
const hoursDiffer = (data: LocationHours): boolean =>
  data.opensAt == null || data.opensAt !== data.closesAt;

const hoursDifferIssue = {
  message: "Opening and closing times must differ",
  path: ["closesAt"],
};

const endsAfterStartIssue = {
  message: "endDate must not be before startDate",
  path: ["endDate"],
};

export const createLocationSchema = locationFields
  .extend({
    timezone: locationFields.shape.timezone.default("UTC"),
    alertsEnabled: locationFields.shape.alertsEnabled.default(true),
  })
  .refine(endsAfterStart, endsAfterStartIssue)
  .refine(hoursComplete, hoursIssue)
  .refine(hoursDiffer, hoursDifferIssue);

/**
 * `endDate: null` clears the end; leaving it out keeps it. Sending both
 * `opensAt` and `closesAt` as null clears the hours.
 */
export const updateLocationSchema = locationFields
  .partial()
  .refine(endsAfterStart, endsAfterStartIssue)
  .refine(sentHoursComplete, hoursIssue)
  .refine(hoursDiffer, hoursDifferIssue);

export const listLocationsQuerySchema = z.object({
  includeDisabled: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export type CreateLocation = z.infer<typeof createLocationSchema>;
export type UpdateLocation = z.infer<typeof updateLocationSchema>;
