import { createQueryKeys } from "@lukemorales/query-key-factory";

import { claimCprSession, getCprSessionClaim } from "./api";
import type { CprSession } from "./types";

export const mutations = {
  claim: claimCprSession,
};

export const queries = createQueryKeys("cpr-sessions", {
  claim: (publicId: CprSession["publicId"]) => {
    return {
      queryKey: ["claim", publicId],
      queryFn: () => {
        return getCprSessionClaim(publicId);
      },
    };
  },
});
