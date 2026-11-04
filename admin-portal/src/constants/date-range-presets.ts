import { endOfMonth, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";

export type DateRangePreset = {
  label: string;
  getRange: () => { from?: Date; to?: Date };
};

export const DATE_RANGE_PRESETS = [
  {
    label: "Today",
    getRange: () => {
      const today = startOfDay(new Date());

      return { from: today, to: today };
    },
  },
  {
    label: "Yesterday",
    getRange: () => {
      const yesterday = startOfDay(subDays(new Date(), 1));

      return { from: yesterday, to: yesterday };
    },
  },
  {
    label: "Last 7 days",
    getRange: () => {
      const today = startOfDay(new Date());

      return { from: subDays(today, 6), to: today };
    },
  },
  {
    label: "Last 30 days",
    getRange: () => {
      const today = startOfDay(new Date());

      return { from: subDays(today, 29), to: today };
    },
  },
  {
    // Month to date: every picker using these presets filters past data, so the
    // range never runs past today.
    label: "This month",
    getRange: () => {
      const today = startOfDay(new Date());

      return { from: startOfMonth(today), to: today };
    },
  },
  {
    label: "Last month",
    getRange: () => {
      const lastMonth = subMonths(startOfDay(new Date()), 1);

      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    },
  },
] as const satisfies DateRangePreset[];

/** Clears the range. Only for filters whose API accepts an open range. */
export const ALL_TIME_PRESET: DateRangePreset = {
  label: "All time",
  getRange: () => {
    return {};
  },
};

export const UNBOUNDED_DATE_RANGE_PRESETS = [ALL_TIME_PRESET, ...DATE_RANGE_PRESETS];
