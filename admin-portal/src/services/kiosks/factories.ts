import { createQueryKeys } from "@lukemorales/query-key-factory";

import { getKiosks } from "./api";

export const queries = createQueryKeys("kiosks", {
  list: {
    queryKey: null,
    queryFn: () => {
      return getKiosks();
    },
  },
});
