import { createQueryKeys } from "@lukemorales/query-key-factory";

import { createKioskPairingCode, getKiosks, revokeKioskPairing } from "./api";

export const queries = createQueryKeys("kiosks", {
  list: {
    queryKey: null,
    queryFn: () => {
      return getKiosks();
    },
  },
});

export const mutations = { createKioskPairingCode, revokeKioskPairing };
