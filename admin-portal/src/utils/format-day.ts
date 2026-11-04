import { format } from "date-fns";

import { parseDateParam } from "@/utils/date-param";

export const formatDay = (value: string, pattern: string) => {
  const date = parseDateParam(value);

  return date ? format(date, pattern) : value;
};
