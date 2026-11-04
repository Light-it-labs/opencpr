import { useEffect, useState } from "react";
import { Controller, type DefaultValues, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HttpStatusCode, isAxiosError } from "axios";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorMessage } from "@/components/ui/error-message";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  type AccessRequest,
  type ApproveAccessRequestFormValues,
  type ApproveAccessRequestPayload,
  approveAccessRequestPayloadSchema,
  useApproveAccessRequest,
} from "@/services/access-requests";
import { USER_ROLE_LABELS, USER_ROLES } from "@/services/users";
import { errorToast, getApiErrorMessage } from "@/utils/error-toast";
import { UserLocationsField } from "./user-locations-field";

const DEFAULT_APPROVE_FORM_VALUES: DefaultValues<ApproveAccessRequestFormValues> = {
  role: USER_ROLES.viewer,
  locationIds: [],
};

type ApproveAccessRequestDialogProps = {
  onClose: () => void;
  request: AccessRequest | undefined;
};

export const ApproveAccessRequestDialog = ({
  onClose,
  request,
}: ApproveAccessRequestDialogProps) => {
  const [serverError, setServerError] = useState<string>();

  const { isPending, mutate: approveAccessRequest } = useApproveAccessRequest();

  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<ApproveAccessRequestFormValues, undefined, ApproveAccessRequestPayload>({
    resolver: zodResolver(approveAccessRequestPayloadSchema),
    defaultValues: DEFAULT_APPROVE_FORM_VALUES,
  });

  const role = useWatch({ control, name: "role" });

  const open = Boolean(request);

  useEffect(() => {
    if (open) {
      setServerError(undefined);
      reset(DEFAULT_APPROVE_FORM_VALUES);
    }
  }, [open, reset]);

  const onSubmit = handleSubmit((payload) => {
    if (!request) {
      return;
    }

    setServerError(undefined);

    approveAccessRequest(
      { id: request.id, payload },
      {
        onSuccess: () => {
          toast.success(`${request.email} approved`);
          onClose();
        },
        onError: (error) => {
          const isConflict =
            isAxiosError(error) && error.response?.status === HttpStatusCode.Conflict;

          if (isConflict) {
            setServerError(getApiErrorMessage(error) ?? "This request can no longer be approved");

            return;
          }

          errorToast(error);
        },
      },
    );
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
        {request ? (
          <>
            <Dialog.Header>
              <Dialog.Title>Approve {request.email}?</Dialog.Title>

              <Dialog.Description>
                Their account is created with this role and they are emailed a sign-in link.
              </Dialog.Description>
            </Dialog.Header>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="flex flex-col gap-2">
                <Label htmlFor="approve-role">Role</Label>

                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => {
                    return (
                      <Select.Root value={field.value} onValueChange={field.onChange}>
                        <Select.Trigger className="w-full" id="approve-role">
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

                <ErrorMessage errorMessage={errors.role?.message ?? serverError} />
              </div>

              {role === USER_ROLES.viewer ? (
                <Controller
                  control={control}
                  name="locationIds"
                  render={({ field }) => {
                    return (
                      <UserLocationsField
                        errorMessage={errors.locationIds?.message}
                        id="approve-locations"
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
                  Approve
                </Button>
              </Dialog.Footer>
            </form>
          </>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
};
