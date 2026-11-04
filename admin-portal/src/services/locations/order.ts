import { compareDesc, parseISO } from "date-fns";

import type { Location } from "./types";

export const sortByStartDateDesc = (locations: Location[]) => {
  return [...locations].sort((first, second) => {
    return compareDesc(parseISO(first.startDate), parseISO(second.startDate));
  });
};
