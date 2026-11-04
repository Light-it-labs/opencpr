import { createQueryKeys } from "@lukemorales/query-key-factory";

import {
  createPasskey,
  deletePasskey,
  getPasskeyLoginOptions,
  getPasskeyRegistrationOptions,
  getPasskeys,
  passkeyLogin,
} from "./api";

export const queries = createQueryKeys("passkeys", {
  list: {
    queryKey: null,
    queryFn: () => {
      return getPasskeys();
    },
  },
});

export const mutations = {
  create: createPasskey,
  delete: deletePasskey,
  login: passkeyLogin,
  loginOptions: getPasskeyLoginOptions,
  registrationOptions: getPasskeyRegistrationOptions,
};
