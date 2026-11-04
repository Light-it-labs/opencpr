import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/config/query-client";
import type { UseMutationProps, UseQueryProps } from "@/services/types";
import { mutations, queries } from "./factories";

const invalidateUsers = () => {
  return queryClient.invalidateQueries({ queryKey: queries._def });
};

export const useUsers = (props?: UseQueryProps<typeof queries.list>) => {
  return useQuery({ ...queries.list, ...props });
};

export const useInviteUser = (props?: UseMutationProps<typeof mutations.inviteUser>) => {
  return useMutation({
    mutationFn: mutations.inviteUser,
    meta: { skipErrorToast: true },
    ...props,
    onSuccess: async (...args) => {
      await invalidateUsers();
      await props?.onSuccess?.(...args);
    },
  });
};

export const useRevokeUser = (props?: UseMutationProps<typeof mutations.revokeUser>) => {
  return useMutation({
    mutationFn: mutations.revokeUser,
    ...props,
    onSuccess: async (...args) => {
      await invalidateUsers();
      await props?.onSuccess?.(...args);
    },
  });
};

export const useUpdateUser = (props?: UseMutationProps<typeof mutations.updateUser>) => {
  return useMutation({
    mutationFn: mutations.updateUser,
    ...props,
    onSuccess: async (...args) => {
      await invalidateUsers();
      await props?.onSuccess?.(...args);
    },
  });
};
