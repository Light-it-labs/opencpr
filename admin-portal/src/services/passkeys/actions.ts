import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/config/query-client";
import { queries as authQueries } from "@/services/auth";
import type { UseMutationProps, UseQueryProps } from "@/services/types";
import { mutations, queries } from "./factories";

const invalidateMe = () => {
  return queryClient.invalidateQueries({ queryKey: authQueries.me.queryKey, refetchType: "all" });
};

const invalidatePasskeys = async () => {
  await Promise.all([queryClient.invalidateQueries({ queryKey: queries._def }), invalidateMe()]);
};

export const usePasskeys = (props?: UseQueryProps<typeof queries.list>) => {
  return useQuery({ ...queries.list, ...props });
};

export const usePasskeyLoginOptions = (props?: UseMutationProps<typeof mutations.loginOptions>) => {
  return useMutation({
    mutationFn: mutations.loginOptions,
    meta: { skipErrorToast: true },
    ...props,
  });
};

export const usePasskeyLogin = (props?: UseMutationProps<typeof mutations.login>) => {
  return useMutation({
    mutationFn: mutations.login,
    ...props,
    onSuccess: async (...args) => {
      await invalidateMe();
      await props?.onSuccess?.(...args);
    },
  });
};

export const usePasskeyRegistrationOptions = (
  props?: UseMutationProps<typeof mutations.registrationOptions>,
) => {
  return useMutation({
    mutationFn: mutations.registrationOptions,
    meta: { skipErrorToast: true },
    ...props,
  });
};

export const useCreatePasskey = (props?: UseMutationProps<typeof mutations.create>) => {
  return useMutation({
    mutationFn: mutations.create,
    ...props,
    onSuccess: async (...args) => {
      await invalidatePasskeys();
      await props?.onSuccess?.(...args);
    },
  });
};

export const useDeletePasskey = (props?: UseMutationProps<typeof mutations.delete>) => {
  return useMutation({
    mutationFn: mutations.delete,
    ...props,
    onSuccess: async (...args) => {
      await invalidatePasskeys();
      await props?.onSuccess?.(...args);
    },
  });
};
