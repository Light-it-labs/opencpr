import { useEffect } from "react";
import { Controller, type DefaultValues, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { startOfDay } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { UNBOUNDED_DATE_RANGE_PRESETS } from "@/constants/date-range-presets";
import { sortByStartDateDesc, useAdminLocations } from "@/services/locations";
import {
  exportParticipantsFormSchema,
  type ExportParticipantsFormValues,
  type ExportParticipantsPayload,
  useExportParticipants,
} from "@/services/participants";

const ALL_LOCATIONS = "all";

const EMPTY_EXPORT_FORM_VALUES: DefaultValues<ExportParticipantsFormValues> = {
  locationId: undefined,
  period: {},
};

type ExportParticipantsDialogProps = {
  onClose: () => void;
  open: boolean;
};

export const ExportParticipantsDialog = ({ onClose, open }: ExportParticipantsDialogProps) => {
  const { data: locations } = useAdminLocations({ enabled: open });
  const { isPending, mutate: exportParticipants } = useExportParticipants();
  const today = startOfDay(new Date());

  const { control, handleSubmit, reset } = useForm<
    ExportParticipantsFormValues,
    undefined,
    ExportParticipantsPayload
  >({
    resolver: zodResolver(exportParticipantsFormSchema),
    defaultValues: EMPTY_EXPORT_FORM_VALUES,
  });

  useEffect(() => {
    if (open) {
      reset(EMPTY_EXPORT_FORM_VALUES);
    }
  }, [open, reset]);

  const onSubmit = handleSubmit((payload) => {
    exportParticipants(payload, {
      onSuccess: () => {
        toast.success("Export ready");
        onClose();
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
          <Dialog.Title>Export participants</Dialog.Title>

          <Dialog.Description>
            Download a CSV of the participants who played at a location within a date range. Leave
            the filters empty to export everyone.
          </Dialog.Description>
        </Dialog.Header>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="export-location">Location</Label>

            <Controller
              control={control}
              name="locationId"
              render={({ field }) => {
                return (
                  <Select.Root
                    value={field.value ?? ALL_LOCATIONS}
                    onValueChange={(next) => {
                      return field.onChange(next === ALL_LOCATIONS ? undefined : next);
                    }}
                  >
                    <Select.Trigger className="w-full" id="export-location">
                      <Select.Value />
                    </Select.Trigger>

                    <Select.Content>
                      <Select.Item value={ALL_LOCATIONS}>All locations</Select.Item>

                      {sortByStartDateDesc(locations ?? []).map((location) => {
                        return (
                          <Select.Item key={location.id} value={location.id}>
                            {location.name}
                          </Select.Item>
                        );
                      })}
                    </Select.Content>
                  </Select.Root>
                );
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label id="export-period-label">Date range</Label>

            <Controller
              control={control}
              name="period"
              render={({ field }) => {
                return (
                  <DateRangePicker
                    disabled={{ after: today }}
                    labelId="export-period-label"
                    placeholder="All time"
                    presets={UNBOUNDED_DATE_RANGE_PRESETS}
                    value={field.value ?? {}}
                    onChange={field.onChange}
                  />
                );
              }}
            />
          </div>

          <Dialog.Footer>
            <Dialog.Close disabled={isPending} asChild>
              <Button type="button" variant="outlined">
                Cancel
              </Button>
            </Dialog.Close>

            <Button isLoading={isPending} type="submit">
              Export
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};
