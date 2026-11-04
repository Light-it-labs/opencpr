import type { SortingState } from "@tanstack/react-table";

const DESC_PREFIX = "-";

export const parseSortingState = (sort?: string): SortingState => {
  if (!sort) {
    return [];
  }

  const desc = sort.startsWith(DESC_PREFIX);

  return [{ id: desc ? sort.slice(DESC_PREFIX.length) : sort, desc }];
};

export const formatSortingState = (state: SortingState): string => {
  const [first] = state;

  if (!first) {
    return "";
  }

  return `${first.desc ? DESC_PREFIX : ""}${first.id}`;
};
