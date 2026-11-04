import { createQueryKeys } from "@lukemorales/query-key-factory";

import { getLocations } from "./api";

export const queries = createQueryKeys("locations", {
  list: () => {
    return {
      queryKey: ["list"],
      queryFn: getLocations,
    };
  },
});
