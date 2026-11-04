import { createQueryKeys } from "@lukemorales/query-key-factory";

import { getUsers, inviteUser, revokeUser, updateUser } from "./api";

export const queries = createQueryKeys("users", {
  list: {
    queryKey: null,
    queryFn: () => {
      return getUsers();
    },
  },
});

export const mutations = { inviteUser, revokeUser, updateUser };
