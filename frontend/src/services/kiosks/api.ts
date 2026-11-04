import { publicApi } from "@/config/api";
import type { Response } from "../types";
import type { KioskHeartbeat } from "./types";

export const sendKioskHeartbeat = async ({
  kioskId,
  ...payload
}: KioskHeartbeat & { kioskId: string }) => {
  const { data } = await publicApi.post<Response<{ received: boolean }>>(
    `/kiosks/${kioskId}/heartbeat`,
    payload,
  );

  return data.data;
};
