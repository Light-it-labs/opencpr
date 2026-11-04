import { publicApi } from "@/config/api";
import type { Response } from "../types";
import type {
  ClaimResult,
  ClaimSession,
  CprSession,
  CreateCprSession,
  CreatedCprSession,
  SessionClaim,
} from "./types";

/** A hung save would hold the outbox, which sends one run at a time. */
const CREATE_TIMEOUT_MS = 15_000;

export const createCprSession = async (payload: CreateCprSession) => {
  const { data } = await publicApi.post<Response<CreatedCprSession>>("/cpr-sessions", payload, {
    timeout: CREATE_TIMEOUT_MS,
  });

  return data.data;
};

/** Submitted from the participant's phone after scanning the kiosk QR. */
export const claimCprSession = async ({
  publicId,
  ...payload
}: ClaimSession & { publicId: CprSession["publicId"] }) => {
  const { data } = await publicApi.post<Response<ClaimResult>>(
    `/cpr-sessions/${publicId}/claim`,
    payload,
  );

  return data.data;
};

/** Polled by the kiosk so it can advance once the phone form is submitted. */
export const getCprSessionClaim = async (publicId: CprSession["publicId"]) => {
  const { data } = await publicApi.get<Response<SessionClaim>>(`/cpr-sessions/${publicId}/claim`);

  return data.data;
};
