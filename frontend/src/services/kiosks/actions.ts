import { useMutation } from "@tanstack/react-query";

import type { UseMutationProps } from "../types";
import { mutations } from "./factories";

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
  });
};
