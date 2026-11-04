import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/config/query-client";
import type { UseMutationProps, UseQueryProps } from "@/services/types";
import { queries as usersQueries } from "@/services/users/factories";
import { mutations, queries } from "./factories";

const invalidateAccessRequests = () => {
  return queryClient.invalidateQueries({ queryKey: queries._def });
};

export const useAccessRequests = (props?: UseQueryProps<typeof queries.list>) => {
  return useQuery({ ...queries.list, ...props });
};

export const useApproveAccessRequest = (
  props?: UseMutationProps<typeof mutations.approveAccessRequest>,
) => {
  return useMutation({
    mutationFn: mutations.approveAccessRequest,
    meta: { skipErrorToast: true },
    ...props,
    onSuccess: async (...args) => {
      await Promise.all([
        invalidateAccessRequests(),
        queryClient.invalidateQueries({ queryKey: usersQueries._def }),
      ]);
      await props?.onSuccess?.(...args);
    },
  });
};

export const useRejectAccessRequest = (
  props?: UseMutationProps<typeof mutations.rejectAccessRequest>,
) => {
  return useMutation({
    mutationFn: mutations.rejectAccessRequest,
    ...props,
    onSuccess: async (...args) => {
      await invalidateAccessRequests();
      await props?.onSuccess?.(...args);
    },
  });
};
