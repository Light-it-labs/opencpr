import * as Sentry from "@sentry/react";
import { QueryClient } from "@tanstack/react-query";
import z from "zod";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      throwOnError: (error) => {
        Sentry.captureException(error);

        return false;
      },
    },
  },
});

export const apiErrorSchema = z.object({
  error: z.string(),
});
