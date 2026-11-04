import { toast } from "sonner";
import { z } from "zod";

const axiosErrorSchema = z.object({
  response: z.object({
    data: z.object({
      error: z.string(),
    }),
  }),
});

export const getApiErrorMessage = (error: unknown) => {
  const parsedError = axiosErrorSchema.safeParse(error);

  return parsedError.success ? parsedError.data.response.data.error : undefined;
};

export const errorToast = (error: unknown) => {
  const message = getApiErrorMessage(error);

  if (message) {
    toast.error("Request failed", { description: message });

    return;
  }

  toast.error("Unknown error", {
    description: "An unknown error occurred. Please try again later.",
  });
};
