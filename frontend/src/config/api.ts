import axios, { type AxiosError } from "axios";

import { getKioskToken } from "@/stores";
import { env } from "./env";

const baseApiConfiguration = {
  baseURL: env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
};

const privateApi = axios.create(baseApiConfiguration);

privateApi.interceptors.request.use(
  (config) => {
    return config;
  },
  (error: Error) => {
    return Promise.reject(error);
  },
);

privateApi.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    return Promise.reject(error);
  },
);

const publicApi = axios.create(baseApiConfiguration);

const kioskApi = axios.create(baseApiConfiguration);

kioskApi.interceptors.request.use((config) => {
  const token = getKioskToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export { kioskApi, privateApi, publicApi };
