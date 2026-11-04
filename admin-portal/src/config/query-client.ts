import * as Sentry from "@sentry/react";
import { MutationCache, QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { ZodError } from "zod";

import { TIME } from "@/constants/time";
import { env } from "@/env";
import { errorToast } from "@/utils/error-toast";

const DEFAULT_QUERY_RETRIES = 3;

const isDevelopment = env.VITE_APP_ENV !== "production";

export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.skipErrorToast) {
        return;
      }

      errorToast(error);
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      throwOnError: (error) => {
        if (error instanceof ZodError && isDevelopment) {
          toast.error("API response did not match the expected schema");
        }

        Sentry.captureException(error);

        return false;
      },
      retry: (failureCount, error) => {
        if (error instanceof ZodError) {
          return false;
        }

        if (isAxiosError(error)) {
          const status = error.response?.status;
          if (status && status >= 400 && status < 500) {
            return false;
          }
        }

        return failureCount < DEFAULT_QUERY_RETRIES;
      },
      staleTime: TIME.MINUTE * 2,
      gcTime: TIME.MINUTE * 5,
    },
  },
});
