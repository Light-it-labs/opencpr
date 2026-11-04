import { format, isValid, parseISO } from "date-fns";

export const DATE_PARAM_FORMAT = "yyyy-MM-dd";

export const parseDateParam = (param: string | undefined) => {
  if (!param) {
    return undefined;
  }

  const date = parseISO(param);

  return isValid(date) ? date : undefined;
};

export const formatDateParam = (date: Date) => {
  return format(date, DATE_PARAM_FORMAT);
};
