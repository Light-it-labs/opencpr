import { useState } from "react";
import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { toast } from "sonner";

import {
  PASSKEY_DEFAULT_NAME,
  useCreatePasskey,
  usePasskeyRegistrationOptions,
} from "@/services/passkeys";

type UseEnrollPasskeyProps = {
  onSuccess?: () => void;
};

export const useEnrollPasskey = ({ onSuccess }: UseEnrollPasskeyProps = {}) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const { isPending: isRequestingOptions, mutateAsync: requestRegistrationOptions } =
    usePasskeyRegistrationOptions();
  const { isPending: isCreating, mutate: createPasskey } = useCreatePasskey();

  const enroll = async (name = "") => {
    try {
      const optionsJSON = await requestRegistrationOptions();

      setIsAuthenticating(true);
      const response = await startRegistration({ optionsJSON });

      createPasskey({ name: name.trim() || PASSKEY_DEFAULT_NAME, response }, { onSuccess });
    } catch (error) {
      if (error instanceof Error && error.name === "InvalidStateError") {
        toast.error("This device already holds a passkey for this account");
      } else if (error instanceof Error && error.name === "NotAllowedError") {
        toast.error("Passkey creation canceled");
      } else {
        toast.error("Unable to create a passkey");
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    actions: { enroll },
    isEnrolling: isRequestingOptions || isAuthenticating || isCreating,
    isSupported: browserSupportsWebAuthn(),
  };
};
