import { format, isSameDay, isSameYear } from "date-fns";

export const formatDateRange = (from: Date, to?: Date, isOpenEnded = false) => {
  if (!to && isOpenEnded) {
    return `${format(from, "MMM d, yyyy")} – ongoing`;
  }

  if (!to || isSameDay(from, to)) {
    return format(from, "MMM d, yyyy");
  }

  if (isSameYear(from, to)) {
    return `${format(from, "MMM d")} – ${format(to, "MMM d, yyyy")}`;
  }

  return `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`;
};
