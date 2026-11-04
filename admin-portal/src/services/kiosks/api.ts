import { api } from "@/config/axios";
import { kiosksResponseSchema } from "./schemas";
import type { Kiosk } from "./types";

export const getKiosks = async (): Promise<Kiosk[]> => {
  const response = await api.get("kiosks");

  return kiosksResponseSchema.parse(response.data).data;
};
