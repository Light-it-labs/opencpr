import { useQuery } from "@tanstack/react-query";

import type { UseQueryProps } from "@/services/types";
import { queries } from "./factories";

export const useKiosks = (props?: UseQueryProps<typeof queries.list>) => {
  return useQuery({ ...queries.list, ...props });
};
