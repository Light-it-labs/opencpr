import { api } from "@/config/axios";
import { ADMIN_PAGE_SIZE } from "@/constants/pagination";
import { sessionDetailResponseSchema, sessionsResponseSchema } from "./schemas";
import type { SessionDetail, SessionsFilters, SessionsPage } from "./types";

export const getSessions = async (filters: SessionsFilters): Promise<SessionsPage> => {
  const response = await api.get("admin/sessions", {
    params: { ...filters, limit: ADMIN_PAGE_SIZE },
  });

  return sessionsResponseSchema.parse(response.data);
};

export const getSession = async (id: number): Promise<SessionDetail> => {
  const response = await api.get(`admin/sessions/${id}`);

  return sessionDetailResponseSchema.parse(response.data).data;
};
