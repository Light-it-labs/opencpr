import { useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { ErrorMessage } from "@/components/ui/error-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRequestMagicLink } from "@/services/auth";
import { requestMagicLinkPayloadSchema } from "@/services/auth/schemas";
import type { RequestMagicLinkPayload } from "@/services/auth/types";

export const MagicLinkForm = () => {
  const [sentTo, setSentTo] = useState<string>();

  const { isPending, mutate: requestMagicLink } = useRequestMagicLink();

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<RequestMagicLinkPayload>({
    defaultValues: { email: "" },
    mode: "onTouched",
    resolver: zodResolver(requestMagicLinkPayloadSchema),
  });

  const onSubmit: SubmitHandler<RequestMagicLinkPayload> = (data) => {
    requestMagicLink(data, {
      onSuccess: () => {
        setSentTo(data.email);
      },
    });
  };

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-medium">Check your inbox</p>

        <p className="text-sm text-text-default-secondary">
          If {sentTo} has access, we sent a sign-in link to it. The link expires soon.
        </p>

        <Button
          size="sm"
          variant="plainText"
          onClick={() => {
            setSentTo(undefined);
          }}
        >
          Use another email
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>

        <Input {...register("email")} id="email" type="email" />

        <ErrorMessage errorMessage={errors.email?.message} />
      </div>

      <Button className="w-full" isLoading={isPending} type="submit">
        Email me a sign-in link
      </Button>
    </form>
  );
};
