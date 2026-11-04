import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { UseQueryProps } from "@/services/types";
import { queries } from "./factories";
import type { SessionsFilters } from "./types";

export const useSessions = (
  filters: SessionsFilters,
  props?: UseQueryProps<typeof queries.list>,
) => {
  return useQuery({ ...queries.list(filters), placeholderData: keepPreviousData, ...props });
};

export const useSession = (id: number, props?: UseQueryProps<typeof queries.detail>) => {
  return useQuery({ ...queries.detail(id), ...props });
};
