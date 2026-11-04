import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/browser";
import type { z } from "zod";

import type { passkeyLoginOptionsResponseSchema, passkeySchema } from "./schemas";

export type Passkey = z.infer<typeof passkeySchema>;

export type PasskeyLoginOptions = z.infer<typeof passkeyLoginOptionsResponseSchema>["data"];

export type PasskeyLoginPayload = {
  challengeId: string;
  response: AuthenticationResponseJSON;
};

export type CreatePasskeyPayload = {
  name: string;
  response: RegistrationResponseJSON;
};
