import { isBefore } from "date-fns";
import { z } from "zod";

import { parseCalendarDate, toCalendarInstant } from "@/utils/calendar-date";
import { LOCATION_DEFAULTS } from "./constants";

const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const timeOfDayFieldSchema = z.union([
  z.literal(""),
  z.string().regex(TIME_OF_DAY_PATTERN, "Use the HH:mm format"),
]);

export const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  city: z.string(),
  address: z.string(),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().nullable(),
  opensAt: z.string().nullable(),
  closesAt: z.string().nullable(),
  timezone: z.string(),
  alertsEnabled: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime().nullable(),
  deletedAt: z.iso.datetime().nullable(),
});

export const locationsResponseSchema = z.object({ data: z.array(locationSchema) });

export const locationResponseSchema = z.object({ data: locationSchema });

export const locationPayloadSchema = z.object({
  name: z.string(),
  country: z.string(),
  city: z.string(),
  address: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  opensAt: z.string().nullable(),
  closesAt: z.string().nullable(),
  timezone: z.string(),
  alertsEnabled: z.boolean(),
});

export const locationFormSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    country: z.string().trim().min(2, "Country must be at least 2 characters"),
    city: z.string().trim().min(2, "City must be at least 2 characters"),
    address: z.string().trim().min(3, "Address must be at least 3 characters"),
    period: z
      .object(
        {
          from: z.date({ message: "Start date is required" }),
          to: z.date().optional(),
        },
        { message: "Start date is required" },
      )
      .refine(
        (period) => {
          return !period.to || !isBefore(period.to, period.from);
        },
        { message: "End date must be on or after the start date" },
      ),
    opensAt: timeOfDayFieldSchema.optional(),
    closesAt: timeOfDayFieldSchema.optional(),
    timezone: z.string().min(1, "Timezone is required").default(LOCATION_DEFAULTS.TIMEZONE),
    alertsEnabled: z.boolean(),
  })
  .refine(
    (values) => {
      return Boolean(values.opensAt) === Boolean(values.closesAt);
    },
    { message: "Set both opening and closing times, or leave both empty", path: ["closesAt"] },
  )
  .transform((values) => {
    return {
      name: values.name,
      country: values.country,
      city: values.city,
      address: values.address,
      startDate: toCalendarInstant(values.period.from),
      endDate: values.period.to ? toCalendarInstant(values.period.to) : null,
      opensAt: values.opensAt || null,
      closesAt: values.closesAt || null,
      timezone: values.timezone,
      alertsEnabled: values.alertsEnabled,
    };
  })
  .pipe(locationPayloadSchema);

export const locationToFormValues = locationSchema.transform((location) => {
  return {
    name: location.name,
    country: location.country,
    city: location.city,
    address: location.address,
    period: {
      from: parseCalendarDate(location.startDate),
      to: location.endDate ? parseCalendarDate(location.endDate) : undefined,
    },
    opensAt: location.opensAt ?? "",
    closesAt: location.closesAt ?? "",
    timezone: location.timezone,
    alertsEnabled: location.alertsEnabled,
  };
});

export const updateLocationRequestSchema = z.object({
  id: z.string(),
  payload: locationPayloadSchema,
});
