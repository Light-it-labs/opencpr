import { useEffect, useState } from "react";
import { Controller, type DefaultValues, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HttpStatusCode, isAxiosError } from "axios";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorMessage } from "@/components/ui/error-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  type InviteUserFormValues,
  type InviteUserPayload,
  inviteUserPayloadSchema,
  useInviteUser,
  USER_ROLE_LABELS,
  USER_ROLES,
} from "@/services/users";
import { errorToast, getApiErrorMessage } from "@/utils/error-toast";
import { UserLocationsField } from "./user-locations-field";

const EMPTY_INVITE_FORM_VALUES: DefaultValues<InviteUserFormValues> = {
  email: "",
  name: "",
  role: USER_ROLES.viewer,
  locationIds: [],
};

type InviteUserDialogProps = {
  onClose: () => void;
  open: boolean;
};

export const InviteUserDialog = ({ onClose, open }: InviteUserDialogProps) => {
  const [serverError, setServerError] = useState<string>();

  const { isPending, mutate: inviteUser } = useInviteUser();

  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<InviteUserFormValues, undefined, InviteUserPayload>({
    resolver: zodResolver(inviteUserPayloadSchema),
    defaultValues: EMPTY_INVITE_FORM_VALUES,
  });

  const role = useWatch({ control, name: "role" });

  useEffect(() => {
    if (open) {
      setServerError(undefined);
      reset(EMPTY_INVITE_FORM_VALUES);
    }
  }, [open, reset]);

  const onSubmit = handleSubmit((payload) => {
    setServerError(undefined);

    inviteUser(payload, {
      onSuccess: () => {
        toast.success("User invited");
        onClose();
      },
      onError: (error) => {
        const isConflict =
          isAxiosError(error) && error.response?.status === HttpStatusCode.Conflict;

        if (isConflict) {
          setServerError(getApiErrorMessage(error) ?? "A user with this email already exists");

          return;
        }

        errorToast(error);
      },
    });
  });

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <Dialog.Content isDismissible={!isPending}>
        <Dialog.Header>
          <Dialog.Title>Invite user</Dialog.Title>

          <Dialog.Description>
            They will be able to request a sign-in link with this email.
          </Dialog.Description>
        </Dialog.Header>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-email">Email</Label>

            <Input {...register("email")} id="invite-email" type="email" />

            <ErrorMessage errorMessage={errors.email?.message ?? serverError} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-name">Name (optional)</Label>

            <Input {...register("name")} id="invite-name" />

            <ErrorMessage errorMessage={errors.name?.message} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-role">Role</Label>

            <Controller
              control={control}
              name="role"
              render={({ field }) => {
                return (
                  <Select.Root value={field.value} onValueChange={field.onChange}>
                    <Select.Trigger className="w-full" id="invite-role">
                      <Select.Value />
                    </Select.Trigger>

                    <Select.Content>
                      {Object.values(USER_ROLES).map((role) => {
                        return (
                          <Select.Item key={role} value={role}>
                            {USER_ROLE_LABELS[role]}
                          </Select.Item>
                        );
                      })}
                    </Select.Content>
                  </Select.Root>
                );
              }}
            />

            <p className="text-xs text-text-default-secondary">
              Viewers can browse data from their locations but cannot create, edit, delete or
              export.
            </p>

            <ErrorMessage errorMessage={errors.role?.message} />
          </div>

          {role === USER_ROLES.viewer ? (
            <Controller
              control={control}
              name="locationIds"
              render={({ field }) => {
                return (
                  <UserLocationsField
                    errorMessage={errors.locationIds?.message}
                    id="invite-locations"
                    value={field.value}
                    onChange={field.onChange}
                  />
                );
              }}
            />
          ) : null}

          <Dialog.Footer>
            <Dialog.Close disabled={isPending} asChild>
              <Button type="button" variant="outlined">
                Cancel
              </Button>
            </Dialog.Close>

            <Button isLoading={isPending} type="submit">
              Invite
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};
