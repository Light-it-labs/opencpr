import { UTCDate } from "@date-fns/utc";
import { formatISO } from "date-fns";

export const parseCalendarDate = (iso: string) => {
  const utcDate = new UTCDate(iso);

  return new Date(utcDate.getFullYear(), utcDate.getMonth(), utcDate.getDate());
};

export const toCalendarInstant = (date: Date) => {
  return formatISO(new UTCDate(date.getFullYear(), date.getMonth(), date.getDate()));
};
