import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/config/query-client";
import type { UseMutationProps, UseQueryProps } from "@/services/types";
import { mutations, queries } from "./factories";

export const useKiosks = (props?: UseQueryProps<typeof queries.list>) => {
  return useQuery({ ...queries.list, ...props });
};

export const useCreateKioskPairingCode = (
  props?: UseMutationProps<typeof mutations.createKioskPairingCode>,
) => {
  return useMutation({
    mutationFn: mutations.createKioskPairingCode,
    meta: { skipErrorToast: true },
    ...props,
  });
};

export const useRevokeKioskPairing = (
  props?: UseMutationProps<typeof mutations.revokeKioskPairing>,
) => {
  return useMutation({
    mutationFn: mutations.revokeKioskPairing,
    ...props,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: queries._def });
      await props?.onSuccess?.(...args);
    },
  });
};
