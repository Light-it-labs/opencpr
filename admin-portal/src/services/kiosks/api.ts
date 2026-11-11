import { api } from "@/config/axios";
import { kioskPairingCodeResponseSchema, kiosksResponseSchema } from "./schemas";
import type { CreateKioskPairingCodePayload, Kiosk, KioskPairingCode } from "./types";

export const getKiosks = async (): Promise<Kiosk[]> => {
  const response = await api.get("kiosks");

  return kiosksResponseSchema.parse(response.data).data;
};

export const createKioskPairingCode = async (
  payload: CreateKioskPairingCodePayload,
): Promise<KioskPairingCode> => {
  const response = await api.post("admin/kiosk-pairing-codes", payload);

  return kioskPairingCodeResponseSchema.parse(response.data).data;
};

export const revokeKioskPairing = async (kioskId: string) => {
  await api.delete(`admin/kiosks/${encodeURIComponent(kioskId)}/pairing`);
};
