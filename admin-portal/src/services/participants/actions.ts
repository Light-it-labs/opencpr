import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/config/query-client";
import { queries as sessionQueries } from "@/services/sessions/factories";
import { queries as statsQueries } from "@/services/stats/factories";
import type { UseMutationProps, UseQueryProps } from "@/services/types";
import { downloadBlob } from "./download-blob";
import { mutations, queries } from "./factories";
import type { ParticipantsFilters } from "./types";

const invalidateParticipants = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queries._def }),
    queryClient.invalidateQueries({ queryKey: sessionQueries._def }),
    queryClient.invalidateQueries({ queryKey: statsQueries._def }),
  ]);
};

export const useParticipants = (
  filters: ParticipantsFilters,
  props?: UseQueryProps<typeof queries.list>,
) => {
  return useQuery({ ...queries.list(filters), placeholderData: keepPreviousData, ...props });
};

export const useDeleteParticipant = (
  props?: UseMutationProps<typeof mutations.deleteParticipant>,
) => {
  return useMutation({
    mutationFn: mutations.deleteParticipant,
    ...props,
    onSuccess: async (...args) => {
      await invalidateParticipants();
      await props?.onSuccess?.(...args);
    },
  });
};

export const useExportParticipants = (
  props?: UseMutationProps<typeof mutations.exportParticipants>,
) => {
  return useMutation({
    mutationFn: mutations.exportParticipants,
    ...props,
    onSuccess: async (file, ...args) => {
      downloadBlob(file.blob, file.filename);
      await props?.onSuccess?.(file, ...args);
    },
  });
};
