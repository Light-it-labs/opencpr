import { createQueryKeys } from "@lukemorales/query-key-factory";

import { logout, me, requestMagicLink, verifyMagicLink } from "./api";

export const queries = createQueryKeys("auth", {
  me: {
    queryKey: null,
    queryFn: () => {
      return me();
    },
  },
});

export const mutations = { logout, requestMagicLink, verifyMagicLink };
