import { type PaginationQuery } from "@/schemas";
import { type PaginatedResponse } from "@/types";

export const paginate = <T>(
  data: T[],
  { limit, page }: PaginationQuery,
  total: number,
): PaginatedResponse<T> => ({
  data,
  pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
});

/** Escapes LIKE wildcards so a search for "50%" matches the text, not everything. */
export const likeContains = (term: string) =>
  `%${term.replace(/[\\%_]/g, "\\$&")}%`;
