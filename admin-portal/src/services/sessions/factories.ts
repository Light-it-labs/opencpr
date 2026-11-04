import { createQueryKeys } from "@lukemorales/query-key-factory";

import { getSession, getSessions } from "./api";
import type { SessionsFilters } from "./types";

export const queries = createQueryKeys("sessions", {
  list: (filters: SessionsFilters) => {
    return {
      queryKey: [filters],
      queryFn: () => {
        return getSessions(filters);
      },
    };
  },
  detail: (id: number) => {
    return {
      queryKey: [id],
      queryFn: () => {
        return getSession(id);
      },
    };
  },
});
