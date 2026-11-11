import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HttpStatusCode, isAxiosError } from "axios";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorMessage } from "@/components/ui/error-message";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useNow } from "@/hooks/use-now";
import {
  type CreateKioskPairingCodePayload,
  createKioskPairingCodePayloadSchema,
  type KioskPairingCode,
  useCreateKioskPairingCode,
} from "@/services/kiosks";
import { getLocationStatus, useAdminLocations } from "@/services/locations";
import { errorToast, getApiErrorMessage } from "@/utils/error-toast";

const EMPTY_PAIR_KIOSK_FORM_VALUES: CreateKioskPairingCodePayload = { locationId: "" };

const PAIRING_CODE_GROUP_LENGTH = 4;

const formatPairingCode = (code: string) => {
  return `${code.slice(0, PAIRING_CODE_GROUP_LENGTH)}-${code.slice(PAIRING_CODE_GROUP_LENGTH)}`;
};

type IssuedPairingCode = KioskPairingCode & { locationName: string };

type PairKioskDialogProps = {
  onClose: () => void;
  open: boolean;
};

export const PairKioskDialog = ({ onClose, open }: PairKioskDialogProps) => {
  const [issuedCode, setIssuedCode] = useState<IssuedPairingCode>();
  const [serverError, setServerError] = useState<string>();

  const now = useNow();
  const { data: locations, isError, isLoading, refetch } = useAdminLocations();
  const { isPending, mutate: createPairingCode } = useCreateKioskPairingCode();

  const eligibleLocations = useMemo(() => {
    return (locations ?? []).filter((location) => {
      return getLocationStatus(location, now) !== "ended";
    });
  }, [locations, now]);

  const hasEligibleLocations = eligibleLocations.length > 0;

  const {
    control,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<CreateKioskPairingCodePayload>({
    resolver: zodResolver(createKioskPairingCodePayloadSchema),
    defaultValues: EMPTY_PAIR_KIOSK_FORM_VALUES,
  });

  useEffect(() => {
    if (open) {
      setIssuedCode(undefined);
      setServerError(undefined);
      reset(EMPTY_PAIR_KIOSK_FORM_VALUES);
    }
  }, [open, reset]);

  const onSubmit = handleSubmit((payload) => {
    setServerError(undefined);

    createPairingCode(payload, {
      onSuccess: (pairingCode) => {
        const location = eligibleLocations.find((candidate) => {
          return candidate.id === payload.locationId;
        });

        setIssuedCode({ ...pairingCode, locationName: location?.name ?? "this location" });
      },
      onError: (error) => {
        const status = isAxiosError(error) ? error.response?.status : undefined;

        if (status === HttpStatusCode.BadRequest || status === HttpStatusCode.NotFound) {
          setServerError(getApiErrorMessage(error) ?? "This location cannot take a kiosk");

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
        {issuedCode ? (
          <>
            <Dialog.Header>
              <Dialog.Title>Pairing code for {issuedCode.locationName}</Dialog.Title>

              <Dialog.Description>
                Type it on the kiosk&apos;s setup screen, with or without the dash. It works once
                and is not shown again.
              </Dialog.Description>
            </Dialog.Header>

            <p className="text-center font-mono text-5xl font-semibold tracking-widest select-all">
              {formatPairingCode(issuedCode.code)}
            </p>

            <p className="text-center text-sm text-text-default-secondary">
              Expires at {format(parseISO(issuedCode.expiresAt), "p")}
            </p>

            <Dialog.Footer>
              <Dialog.Close asChild>
                <Button type="button">Done</Button>
              </Dialog.Close>
            </Dialog.Footer>
          </>
        ) : (
          <>
            <Dialog.Header>
              <Dialog.Title>Pair a kiosk</Dialog.Title>

              <Dialog.Description>
                Create a one-time code for the location the kiosk stands at, then type it on the
                kiosk&apos;s setup screen within 15 minutes.
              </Dialog.Description>
            </Dialog.Header>

            {isError ? (
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm">Could not load locations.</p>

                <Button
                  variant="outlined"
                  onClick={() => {
                    return refetch();
                  }}
                >
                  Retry
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pair-kiosk-location">Location</Label>

                  {isLoading ? (
                    <p className="text-sm text-text-default-secondary">Loading locations…</p>
                  ) : null}

                  {!isLoading && !hasEligibleLocations ? (
                    <p className="text-sm text-text-default-secondary">
                      No location can take a kiosk right now. Create one, or extend an ended one,
                      under Locations.
                    </p>
                  ) : null}

                  {hasEligibleLocations ? (
                    <Controller
                      control={control}
                      name="locationId"
                      render={({ field }) => {
                        return (
                          <Select.Root value={field.value} onValueChange={field.onChange}>
                            <Select.Trigger className="w-full" id="pair-kiosk-location">
                              <Select.Value placeholder="Choose a location" />
                            </Select.Trigger>

                            <Select.Content>
                              {eligibleLocations.map((location) => {
                                return (
                                  <Select.Item key={location.id} value={location.id}>
                                    {location.name} — {location.city}
                                  </Select.Item>
                                );
                              })}
                            </Select.Content>
                          </Select.Root>
                        );
                      }}
                    />
                  ) : null}

                  <ErrorMessage errorMessage={errors.locationId?.message ?? serverError} />
                </div>

                <Dialog.Footer>
                  <Dialog.Close disabled={isPending} asChild>
                    <Button type="button" variant="outlined">
                      Cancel
                    </Button>
                  </Dialog.Close>

                  <Button disabled={!hasEligibleLocations} isLoading={isPending} type="submit">
                    Create code
                  </Button>
                </Dialog.Footer>
              </form>
            )}
          </>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
};
