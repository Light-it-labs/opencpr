import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/config/query-client";
import { queries as kioskQueries } from "@/services/kiosks/factories";
import type { UseMutationProps, UseQueryProps } from "@/services/types";
import { mutations, queries } from "./factories";

const invalidateLocations = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queries._def }),
    queryClient.invalidateQueries({ queryKey: kioskQueries._def }),
  ]);
};

export const useAdminLocations = (props?: UseQueryProps<typeof queries.adminList>) => {
  return useQuery({ ...queries.adminList, placeholderData: keepPreviousData, ...props });
};

export const useCreateLocation = (props?: UseMutationProps<typeof mutations.createLocation>) => {
  return useMutation({
    mutationFn: mutations.createLocation,
    ...props,
    onSuccess: async (...args) => {
      await invalidateLocations();
      await props?.onSuccess?.(...args);
    },
  });
};

export const useUpdateLocation = (props?: UseMutationProps<typeof mutations.updateLocation>) => {
  return useMutation({
    mutationFn: mutations.updateLocation,
    ...props,
    onSuccess: async (...args) => {
      await invalidateLocations();
      await props?.onSuccess?.(...args);
    },
  });
};

export const useDeleteLocation = (props?: UseMutationProps<typeof mutations.deleteLocation>) => {
  return useMutation({
    mutationFn: mutations.deleteLocation,
    ...props,
    onSuccess: async (...args) => {
      await invalidateLocations();
      await props?.onSuccess?.(...args);
    },
  });
};
