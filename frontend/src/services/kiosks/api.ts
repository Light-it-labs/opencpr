import { kioskApi, publicApi } from "@/config/api";
import type { Response } from "../types";
import type { KioskHeartbeat, KioskPairing, PairKiosk } from "./types";

export const sendKioskHeartbeat = async ({
  kioskId,
  ...payload
}: KioskHeartbeat & { kioskId: string }) => {
  const { data } = await kioskApi.post<Response<{ received: boolean }>>(
    `/kiosks/${kioskId}/heartbeat`,
    payload,
  );

  return data.data;
};

export const pairKiosk = async (payload: PairKiosk) => {
  const { data } = await publicApi.post<Response<KioskPairing>>("/kiosks/pair", payload);

  return data.data;
};
