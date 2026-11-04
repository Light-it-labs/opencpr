import { createQueryKeys } from "@lukemorales/query-key-factory";

import { createLocation, deleteLocation, getAdminLocations, updateLocation } from "./api";

export const queries = createQueryKeys("locations", {
  adminList: {
    queryKey: null,
    queryFn: () => {
      return getAdminLocations();
    },
  },
});

export const mutations = { createLocation, deleteLocation, updateLocation };
