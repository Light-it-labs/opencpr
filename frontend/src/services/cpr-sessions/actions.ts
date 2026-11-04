import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";

import { apiErrorSchema } from "@/config/query-client";
import type { UseMutationProps, UseQueryProps } from "../types";
import { mutations, queries } from "./factories";
import type { CprSession } from "./types";

/** Used on the phone page reached by scanning the kiosk QR. */
export const useClaimCprSession = (props?: UseMutationProps<typeof mutations.claim>) => {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: mutations.claim,
    ...props,
    onError: (error, ...args) => {
      toast.error(
        isAxiosError(error) && apiErrorSchema.safeParse(error.response?.data).success
          ? error.response?.data.error
          : t("common.requestError"),
      );

      props?.onError?.(error, ...args);
    },
  });
};

/**
 * Polled by the kiosk registration screen so it can advance by itself once the
 * participant submits on their phone. Failures are silent by design: the screen
 * always has a manual way forward, and a booth must not surface network noise.
 */
export const useCprSessionClaim = (
  publicId: CprSession["publicId"] | null,
  props?: UseQueryProps<typeof queries.claim>,
) => {
  return useQuery({
    ...queries.claim(publicId ?? ""),
    enabled: Boolean(publicId),
    refetchInterval: 2_000,
    retry: false,
    ...props,
  });
};
