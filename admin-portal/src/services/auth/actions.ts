import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/config/query-client";
import { TIME } from "@/constants/time";
import type { UseMutationProps, UseQueryProps } from "@/services/types";
import { USER_ROLES } from "@/services/users/constants";
import { mutations, queries } from "./factories";

export const meQuery = { ...queries.me, staleTime: TIME.MINUTE * 5, retry: false };

export const useMe = (props?: UseQueryProps<typeof meQuery>) => {
  return useQuery({ ...meQuery, ...props });
};

export const useCanManage = () => {
  return useMe().data?.role === USER_ROLES.admin;
};

export const useIsSingleLocationScope = () => {
  return useMe().data?.locationIds?.length === 1;
};

export const useRequestMagicLink = (
  props?: UseMutationProps<typeof mutations.requestMagicLink>,
) => {
  return useMutation({ mutationFn: mutations.requestMagicLink, ...props });
};

export const useVerifyMagicLink = (props?: UseMutationProps<typeof mutations.verifyMagicLink>) => {
  return useMutation({
    mutationFn: mutations.verifyMagicLink,
    meta: { skipErrorToast: true },
    ...props,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: queries.me.queryKey, refetchType: "all" });
      await props?.onSuccess?.(...args);
    },
  });
};

export const useLogout = (props?: UseMutationProps<typeof mutations.logout>) => {
  return useMutation({
    mutationFn: mutations.logout,
    ...props,
    onSettled: async (...args) => {
      queryClient.removeQueries({ queryKey: queries.me.queryKey });
      await props?.onSettled?.(...args);
      queryClient.clear();
    },
  });
};
