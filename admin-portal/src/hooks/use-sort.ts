import { useMemo } from "react";
import { getRouteApi } from "@tanstack/react-router";
import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { z } from "zod";

import type { AvailableRoutesId } from "@/config/router";
import { formatSortingState, parseSortingState } from "@/utils/sorting-state";

export const sortValidation = z.object({
  sort: z.string().optional(),
});

type UseSortProps = {
  defaultSort: string;
  path: AvailableRoutesId;
};

export const useSort = ({ defaultSort, path }: UseSortProps) => {
  const { useNavigate, useSearch } = getRouteApi(path);

  const search = useSearch();
  const navigate = useNavigate();

  const { sort: urlSort } = useMemo(() => {
    return sortValidation.parse(search);
  }, [search]);

  const sort = urlSort ?? defaultSort;

  const tableSorting = useMemo(() => {
    return parseSortingState(sort);
  }, [sort]);

  const setSort = (value: string) => {
    navigate({
      search: (prev) => {
        return { ...prev, page: 1, sort: value && value !== defaultSort ? value : undefined };
      },
    });
  };

  const onSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSort(formatSortingState(typeof updater === "function" ? updater(tableSorting) : updater));
  };

  return { actions: { onSortingChange, setSort }, sort, tableSorting, urlSort };
};
