import { useState } from "react";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { usePasskeyLogin, usePasskeyLoginOptions } from "@/services/passkeys";
import { redirectTarget } from "@/utils/redirect-target";

export const PasskeyLoginForm = () => {
  const navigate = useNavigate();
  const search = useSearch({ from: "/(public)/_guest/login/" });
  const [isSigningIn, setIsSigningIn] = useState(false);

  const { mutateAsync: requestPasskeyOptions } = usePasskeyLoginOptions();
  const { mutateAsync: passkeyLogin } = usePasskeyLogin({ meta: { skipErrorToast: true } });

  const handleSignIn = async () => {
    setIsSigningIn(true);

    try {
      const { challengeId, options } = await requestPasskeyOptions();
      const response = await startAuthentication({ optionsJSON: options });

      await passkeyLogin({ challengeId, response });
      await navigate(redirectTarget(search.redirect));
    } catch (error) {
      const wasCanceled = error instanceof Error && error.name === "NotAllowedError";

      toast.error(wasCanceled ? "Sign-in canceled" : "Unable to sign in with a passkey");
      setIsSigningIn(false);
    }
  };

  if (!browserSupportsWebAuthn()) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-row items-center gap-4">
        <div className="h-px w-full bg-border-default-default" />

        <p className="text-center text-sm text-text-default-tertiary">Or</p>

        <div className="h-px w-full bg-border-default-default" />
      </div>

      <Button
        className="w-full justify-center"
        isLoading={isSigningIn}
        PrefixIcon={<Icons.Lock />}
        variant="outlined"
        onClick={() => {
          return void handleSignIn();
        }}
      >
        Sign in with a passkey
      </Button>
    </div>
  );
};
