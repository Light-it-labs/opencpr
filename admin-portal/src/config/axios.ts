import axios, { type AxiosError, HttpStatusCode } from "axios";

import { env } from "@/env";

declare module "axios" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface AxiosRequestConfig {
    isAuthProbe?: boolean;
  }
}

export const api = axios.create({
  baseURL: env.VITE_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.response.use(undefined, (error: AxiosError) => {
  const isAuthProbe = Boolean(error.config?.isAuthProbe);

  if (error.response?.status === HttpStatusCode.Unauthorized && !isAuthProbe) {
    const onLoginScreen = window.location.pathname === "/login";
    if (!onLoginScreen) {
      const redirectTarget = `${window.location.pathname}${window.location.search || ""}`;
      window.location.href = `/login?redirect=${encodeURIComponent(redirectTarget)}`;
    }
  }

  return Promise.reject(error);
});
