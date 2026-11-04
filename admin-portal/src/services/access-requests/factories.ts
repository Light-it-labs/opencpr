import { createQueryKeys } from "@lukemorales/query-key-factory";

import { approveAccessRequest, getAccessRequests, rejectAccessRequest } from "./api";

export const queries = createQueryKeys("access-requests", {
  list: {
    queryKey: null,
    queryFn: () => {
      return getAccessRequests();
    },
  },
});

export const mutations = { approveAccessRequest, rejectAccessRequest };
