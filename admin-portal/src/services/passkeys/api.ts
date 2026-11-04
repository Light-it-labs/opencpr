import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";

import { api } from "@/config/axios";
import { type User, userResponseSchema } from "@/services/auth";
import {
  passkeyLoginOptionsResponseSchema,
  passkeyRegistrationOptionsResponseSchema,
  passkeyResponseSchema,
  passkeysResponseSchema,
} from "./schemas";
import type {
  CreatePasskeyPayload,
  Passkey,
  PasskeyLoginOptions,
  PasskeyLoginPayload,
} from "./types";

export const getPasskeyLoginOptions = async (): Promise<PasskeyLoginOptions> => {
  const response = await api.post("auth/passkeys/login/options");

  return passkeyLoginOptionsResponseSchema.parse(response.data).data;
};

export const passkeyLogin = async (payload: PasskeyLoginPayload): Promise<User> => {
  const response = await api.post("auth/passkeys/login/verify", payload);

  return userResponseSchema.parse(response.data).data;
};

export const getPasskeyRegistrationOptions =
  async (): Promise<PublicKeyCredentialCreationOptionsJSON> => {
    const response = await api.post("auth/passkeys/register/options");

    return passkeyRegistrationOptionsResponseSchema.parse(response.data).data;
  };

export const createPasskey = async (payload: CreatePasskeyPayload): Promise<Passkey> => {
  const response = await api.post("auth/passkeys/register/verify", payload);

  return passkeyResponseSchema.parse(response.data).data;
};

export const getPasskeys = async (): Promise<Passkey[]> => {
  const response = await api.get("auth/passkeys");

  return passkeysResponseSchema.parse(response.data).data;
};

export const deletePasskey = async (id: number) => {
  await api.delete(`auth/passkeys/${id}`);
};
