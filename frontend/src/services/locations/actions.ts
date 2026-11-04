import { useQuery } from "@tanstack/react-query";

import type { UseQueryProps } from "../types";
import { queries } from "./factories";

export const useLocations = (props?: UseQueryProps<typeof queries.list>) => {
  return useQuery({
    ...queries.list(),
    ...props,
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
  });
};
