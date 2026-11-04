import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { env } from "@/env";
import { MagicLinkConsume } from "./-components/magic-link-consume";
import { MagicLinkForm } from "./-components/magic-link-form";
import { PasskeyLoginForm } from "./-components/passkey-login-form";

const LoginPage = () => {
  const { token } = Route.useSearch();

  if (token) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <MagicLinkConsume token={token} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <Card.Root className="w-full max-w-sm gap-8 p-8">
        <Card.Header className="items-center gap-3 text-center">
          <Logo className="justify-center" tone="ink" />

          <Card.Title>{env.VITE_APP_NAME}</Card.Title>

          <Card.Description>Sign in to manage the CPR training booths</Card.Description>
        </Card.Header>

        <Card.Content className="flex flex-col gap-6">
          <MagicLinkForm />

          <PasskeyLoginForm />
        </Card.Content>
      </Card.Root>
    </div>
  );
};

export const Route = createFileRoute("/(public)/_guest/login/")({
  component: LoginPage,
  validateSearch: z.object({
    token: z.string().optional().catch(undefined),
  }),
});
