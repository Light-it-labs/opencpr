import { utc } from "@date-fns/utc";
import { endOfDay, parseISO, startOfDay } from "date-fns";
import z from "zod";

// `YYYY-MM-DD`, read as UTC: the API stores and compares in UTC, so a bare
// date has to mean the same instant for every admin regardless of their zone.
const isoDate = z.iso.date().transform((value) => parseISO(value, { in: utc }));

export const dateRangeFields = {
  dateFrom: isoDate.transform((date) => startOfDay(date)).optional(),
  // The end date is inclusive, so the filter must reach the last millisecond.
  dateTo: isoDate.transform((date) => endOfDay(date)).optional(),
};

// MySQL compares these ids case-insensitively but JavaScript does not, so the
// id is canonicalized here or a "not yourself" check could be dodged with
// uppercase hex.
export const uuidParamSchema = z.object({
  id: z.uuid().transform((id) => id.toLowerCase()),
});

export type SortDirection = "asc" | "desc";

export type SortDirective<TField extends string> = {
  field: TField;
  direction: SortDirection;
};

/**
 * `sort=<field>` is ascending and `sort=-<field>` descending, one field per
 * list. Each list names its own allowed fields and default, so an unknown
 * field is a 400 here instead of an arbitrary column name reaching a query.
 */
export const sortParamSchema = <TField extends string>(
  fields: readonly TField[],
  fallback: SortDirective<TField>,
) =>
  z
    .string()
    .transform((value, ctx): SortDirective<TField> => {
      const direction = value.startsWith("-") ? "desc" : "asc";
      const field = direction === "desc" ? value.slice(1) : value;
      const allowed = fields.find((candidate) => candidate === field);

      if (!allowed) {
        ctx.addIssue({
          code: "custom",
          message: `Must be one of: ${fields.join(", ")} (prefix with - for descending)`,
        });
        return z.NEVER;
      }

      return { field: allowed, direction };
    })
    .default(fallback);
