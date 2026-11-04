import { createQueryKeys } from "@lukemorales/query-key-factory";

import { deleteParticipant, exportParticipants, getParticipants } from "./api";
import type { ParticipantsFilters } from "./types";

export const queries = createQueryKeys("participants", {
  list: (filters: ParticipantsFilters) => {
    return {
      queryKey: [filters],
      queryFn: () => {
        return getParticipants(filters);
      },
    };
  },
});

export const mutations = { deleteParticipant, exportParticipants };
