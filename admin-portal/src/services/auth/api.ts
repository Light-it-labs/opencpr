import { HttpStatusCode, isAxiosError } from "axios";

import { api } from "@/config/axios";
import { userResponseSchema } from "./schemas";
import type { RequestMagicLinkPayload, User, VerifyMagicLinkPayload } from "./types";

export const requestMagicLink = async (payload: RequestMagicLinkPayload) => {
  await api.post("auth/magic-link", payload);
};

export const verifyMagicLink = async (payload: VerifyMagicLinkPayload): Promise<User> => {
  const response = await api.post("auth/magic-link/verify", payload, { isAuthProbe: true });

  return userResponseSchema.parse(response.data).data;
};

export const me = async (): Promise<User | null> => {
  try {
    const response = await api.get("auth/me", { isAuthProbe: true });

    return userResponseSchema.parse(response.data).data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === HttpStatusCode.Unauthorized) {
      return null;
    }

    throw error;
  }
};

export const logout = async () => {
  await api.post("auth/logout");
};
