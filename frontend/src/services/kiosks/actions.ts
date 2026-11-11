import { useMutation } from "@tanstack/react-query";
import { HttpStatusCode, isAxiosError } from "axios";

import { clearKioskPairing, setKioskPairing } from "@/stores";
import { retryCprSessionOutbox } from "../cpr-sessions/outbox";
import type { UseMutationProps } from "../types";
import { mutations } from "./factories";

const UNPAIRED_HEARTBEAT_STATUSES: readonly number[] = [
  HttpStatusCode.Unauthorized,
  HttpStatusCode.Conflict,
];

/**
 * Deliberately silent on failure. A booth must never surface network noise to a
 * participant, and a missed heartbeat already shows up as the kiosk going
 * offline on the status endpoint.
 */
export const useSendKioskHeartbeat = (props?: UseMutationProps<typeof mutations.heartbeat>) => {
  return useMutation({
    mutationFn: mutations.heartbeat,
    retry: false,
    ...props,
    onError: (error, ...args) => {
      const status = isAxiosError(error) ? error.response?.status : undefined;

      if (status !== undefined && UNPAIRED_HEARTBEAT_STATUSES.includes(status)) {
        clearKioskPairing();
      }

      props?.onError?.(error, ...args);
    },
  });
};

export const usePairKiosk = (props?: UseMutationProps<typeof mutations.pair>) => {
  return useMutation({
    mutationFn: mutations.pair,
    ...props,
    onSuccess: (pairing, ...args) => {
      setKioskPairing(pairing);
      retryCprSessionOutbox();

      props?.onSuccess?.(pairing, ...args);
    },
  });
};
