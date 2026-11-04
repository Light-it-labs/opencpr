import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { queryClient } from "@/config/query-client";
import { useEnrollPasskey } from "@/hooks/use-enroll-passkey";
import { meQuery } from "@/services/auth";
import { redirectTarget } from "@/utils/redirect-target";

const SecureAccessPage = () => {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const goToDashboard = () => {
    return void navigate(redirectTarget(search.redirect));
  };

  const {
    actions: { enroll },
    isEnrolling,
    isSupported,
  } = useEnrollPasskey({ onSuccess: goToDashboard });

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <Card.Root className="w-full max-w-sm gap-8 p-8">
        <Card.Header className="items-center gap-3 text-center">
          <Card.Title>Secure your access</Card.Title>

          <Card.Description>
            Sign in next time with your fingerprint, face or screen lock instead of waiting for an
            email. It stays on this device, and you can manage it later from Security.
          </Card.Description>
        </Card.Header>

        <Card.Content className="flex flex-col gap-3">
          {isSupported ? (
            <>
              <Button
                className="w-full justify-center"
                isLoading={isEnrolling}
                PrefixIcon={<Icons.Lock />}
                onClick={() => {
                  return void enroll();
                }}
              >
                Create passkey
              </Button>

              <Button className="w-full justify-center" variant="plainText" onClick={goToDashboard}>
                Not now
              </Button>
            </>
          ) : (
            <Button className="w-full justify-center" onClick={goToDashboard}>
              Continue
            </Button>
          )}
        </Card.Content>
      </Card.Root>
    </div>
  );
};

export const Route = createFileRoute("/secure-access/")({
  validateSearch: z.object({
    redirect: z.string().optional().catch(""),
  }),
  component: SecureAccessPage,
  beforeLoad: async () => {
    const user = await queryClient.ensureQueryData(meQuery);

    if (!user) {
      throw redirect({ to: "/login", search: { redirect: "/secure-access" } });
    }

    if (user.passkeysCount > 0) {
      throw redirect({ to: "/" });
    }
  },
});
