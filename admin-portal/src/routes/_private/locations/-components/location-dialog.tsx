import { useEffect, useMemo } from "react";
import { Controller, type DefaultValues, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Dialog } from "@/components/ui/dialog";
import { ErrorMessage } from "@/components/ui/error-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  type Location,
  LOCATION_DEFAULTS,
  LOCATION_TIMEZONES,
  LOCATION_UTC_TIMEZONE,
  locationFormSchema,
  type LocationFormValues,
  type LocationPayload,
  locationToFormValues,
  useCreateLocation,
  useUpdateLocation,
} from "@/services/locations";

const EMPTY_LOCATION_FORM_VALUES: DefaultValues<LocationFormValues> = {
  name: "",
  country: LOCATION_DEFAULTS.COUNTRY,
  city: LOCATION_DEFAULTS.CITY,
  address: "",
  opensAt: "",
  closesAt: "",
  timezone: LOCATION_DEFAULTS.TIMEZONE,
  alertsEnabled: true,
};

type LocationDialogProps = {
  location?: Location;
  onClose: () => void;
  open: boolean;
};

export const LocationDialog = ({ location, onClose, open }: LocationDialogProps) => {
  const { isPending: isCreating, mutate: createLocation } = useCreateLocation();
  const { isPending: isUpdating, mutate: updateLocation } = useUpdateLocation();

  const {
    control,
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
  } = useForm<LocationFormValues, undefined, LocationPayload>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: EMPTY_LOCATION_FORM_VALUES,
  });

  useEffect(() => {
    if (open) {
      reset(location ? locationToFormValues.parse(location) : EMPTY_LOCATION_FORM_VALUES);
    }
  }, [location, open, reset]);

  const timezoneOptions = useMemo(() => {
    const supported = new Set<string>(Intl.supportedValuesOf("timeZone"));
    const options = LOCATION_TIMEZONES.filter((timezone) => {
      return timezone === LOCATION_UTC_TIMEZONE || supported.has(timezone);
    });

    return location &&
      !options.some((option) => {
        return option === location.timezone;
      })
      ? [...options, location.timezone]
      : options;
  }, [location]);

  const isSubmitting = isCreating || isUpdating;

  const onSubmit = handleSubmit((payload) => {
    if (!location) {
      createLocation(payload, {
        onSuccess: () => {
          toast.success("Location created");
          onClose();
        },
      });

      return;
    }

    updateLocation(
      { id: location.id, payload },
      {
        onSuccess: () => {
          toast.success("Location updated");
          onClose();
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
      <Dialog.Content isDismissible={!isSubmitting}>
        <Dialog.Header>
          <Dialog.Title>{location ? "Edit location" : "New location"}</Dialog.Title>

          <Dialog.Description>
            {location
              ? "Update the details kiosks show for this location."
              : "Add a location kiosks can be set up at."}
          </Dialog.Description>
        </Dialog.Header>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>

            <Input {...register("name")} id="name" />

            <ErrorMessage errorMessage={errors.name?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="city">City</Label>

              <Input {...register("city")} id="city" />

              <ErrorMessage errorMessage={errors.city?.message} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="country">Country</Label>

              <Input {...register("country")} id="country" />

              <ErrorMessage errorMessage={errors.country?.message} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Address</Label>

            <Input {...register("address")} id="address" />

            <ErrorMessage errorMessage={errors.address?.message} />
          </div>

          <div className="flex flex-col gap-2">
            <Label id="period-label">Dates</Label>

            <Controller
              control={control}
              name="period"
              render={({ field }) => {
                return (
                  <DateRangePicker
                    labelId="period-label"
                    value={field.value ?? {}}
                    allowOpenEnd
                    onChange={field.onChange}
                  />
                );
              }}
            />

            <ErrorMessage
              errorMessage={
                errors.period?.from?.message ?? errors.period?.to?.message ?? errors.period?.message
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label id="hours-label">Opening hours (optional)</Label>

            <div aria-labelledby="hours-label" className="grid grid-cols-2 gap-4" role="group">
              <div className="flex flex-col gap-2">
                <Label htmlFor="opensAt">Opens</Label>

                <Input {...register("opensAt")} id="opensAt" step={60} type="time" />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="closesAt">Closes</Label>

                <Input {...register("closesAt")} id="closesAt" step={60} type="time" />
              </div>
            </div>

            <p className="text-xs text-text-default-secondary">
              Leave empty to monitor around the clock
            </p>

            <ErrorMessage errorMessage={errors.opensAt?.message ?? errors.closesAt?.message} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="timezone">Timezone</Label>

            <Controller
              control={control}
              name="timezone"
              render={({ field }) => {
                return (
                  <Select.Root value={field.value} onValueChange={field.onChange}>
                    <Select.Trigger className="w-full" id="timezone">
                      <Select.Value />
                    </Select.Trigger>

                    <Select.Content>
                      {timezoneOptions.map((timezone) => {
                        return (
                          <Select.Item key={timezone} value={timezone}>
                            {timezone}
                          </Select.Item>
                        );
                      })}
                    </Select.Content>
                  </Select.Root>
                );
              }}
            />

            <ErrorMessage errorMessage={errors.timezone?.message} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Controller
                control={control}
                name="alertsEnabled"
                render={({ field }) => {
                  return (
                    <Checkbox
                      aria-describedby="alertsEnabled-description"
                      checked={field.value}
                      id="alertsEnabled"
                      onCheckedChange={(checked) => {
                        field.onChange(checked === true);
                      }}
                    />
                  );
                }}
              />

              <Label htmlFor="alertsEnabled">Health alerts</Label>
            </div>

            <p className="text-xs text-text-default-secondary" id="alertsEnabled-description">
              Send booth down/recovered alerts for kiosks at this location
            </p>
          </div>

          <Dialog.Footer>
            <Dialog.Close disabled={isSubmitting} asChild>
              <Button type="button" variant="outlined">
                Cancel
              </Button>
            </Dialog.Close>

            <Button disabled={Boolean(location) && !isDirty} isLoading={isSubmitting} type="submit">
              {location ? "Save changes" : "Create"}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};
