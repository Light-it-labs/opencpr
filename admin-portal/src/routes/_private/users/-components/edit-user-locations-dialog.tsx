import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  type PortalUser,
  userLocationsFormSchema,
  type UserLocationsFormValues,
  useUpdateUser,
} from "@/services/users";
import { UserLocationsField } from "./user-locations-field";

type EditUserLocationsDialogProps = {
  onClose: () => void;
  user: PortalUser | undefined;
};

export const EditUserLocationsDialog = ({ onClose, user }: EditUserLocationsDialogProps) => {
  const { isPending, mutate: updateUser } = useUpdateUser();

  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<UserLocationsFormValues>({
    resolver: zodResolver(userLocationsFormSchema),
    defaultValues: { locationIds: [] },
  });

  useEffect(() => {
    if (user) {
      reset({ locationIds: user.locationIds });
    }
  }, [user, reset]);

  const onSubmit = handleSubmit((payload) => {
    if (!user) {
      return;
    }

    updateUser(
      { id: user.id, payload },
      {
        onSuccess: () => {
          toast.success("Locations updated");
          onClose();
        },
      },
    );
  });

  return (
    <Dialog.Root
      open={Boolean(user)}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <Dialog.Content isDismissible={!isPending}>
        {user ? (
          <>
            <Dialog.Header>
              <Dialog.Title>Edit locations for {user.email}</Dialog.Title>

              <Dialog.Description>
                They will only see sessions, kiosks, statistics and participants from these
                locations.
              </Dialog.Description>
            </Dialog.Header>

            <form className="space-y-4" onSubmit={onSubmit}>
              <Controller
                control={control}
                name="locationIds"
                render={({ field }) => {
                  return (
                    <UserLocationsField
                      errorMessage={errors.locationIds?.message}
                      id="edit-user-locations"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  );
                }}
              />

              <Dialog.Footer>
                <Dialog.Close disabled={isPending} asChild>
                  <Button type="button" variant="outlined">
                    Cancel
                  </Button>
                </Dialog.Close>

                <Button isLoading={isPending} type="submit">
                  Save
                </Button>
              </Dialog.Footer>
            </form>
          </>
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
};
