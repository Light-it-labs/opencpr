import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

import { Button, Label, RadioGroup, Select } from "@/components/ui";
import { DEFAULT_LANGUAGE, LANGUAGES } from "@/i18n";
import { useLocations } from "@/services/locations";
import {
  CHALLENGE_MODES,
  setLanguage,
  setLocationId,
  setMode,
  setSerialPort,
  useLanguage,
  useLocationId,
} from "@/stores";
import { getAuthorizedPort, isSerialSupported, requestSerialPort } from "@/utils";

export const setupFormSchema = z.object({
  mode: z.enum([CHALLENGE_MODES.ARDUINO, CHALLENGE_MODES.MANUAL]),
  // Which venue this machine is standing in. Stored per browser rather than
  // baked into the build, so one deployment serves every event.
  locationId: z.string().min(1),
  language: z.enum([LANGUAGES.EN, LANGUAGES.ES]),
});

export type SetupFormData = z.infer<typeof setupFormSchema>;

const RouteComponent = () => {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();

  const savedLocationId = useLocationId();
  const savedLanguage = useLanguage();
  const { data: locations, isPending: isLoadingLocations } = useLocations();

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    watch,
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: {
      mode: CHALLENGE_MODES.ARDUINO,
      locationId: savedLocationId ?? "",
      language: savedLanguage ?? DEFAULT_LANGUAGE,
    },
  });

  const selectedMode = watch("mode");

  const onSubmit = async (data: SetupFormData) => {
    setMode(data.mode);
    setLocationId(data.locationId);
    setLanguage(data.language);

    // Request serial port access only if Arduino mode is selected
    if (data.mode === CHALLENGE_MODES.ARDUINO) {
      if (!isSerialSupported()) {
        toast.error(t("setup.messages.unsupportedBrowser"));

        return;
      }

      // A port authorized on a previous run reconnects without the native
      // chooser, which cannot be reached in fullscreen kiosk mode.
      const port = (await getAuthorizedPort()) ?? (await requestSerialPort());

      if (!port) {
        toast.error(t("setup.messages.portRequestError"));

        return;
      }

      setSerialPort(port);
    }
    await navigate({ to: "/" });
  };

  return (
    <form
      className="flex w-full flex-col justify-center space-y-6"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="flex flex-col gap-4">
        <Label aria-required>{t("setup.language.label")}</Label>

        <Controller
          control={control}
          name="language"
          render={({ field }) => {
            return (
              <RadioGroup.Root
                onValueChange={(language) => {
                  field.onChange(language);
                  void i18n.changeLanguage(language);
                }}
                value={field.value}
              >
                {Object.values(LANGUAGES).map((language) => {
                  return (
                    <div className="flex items-center space-x-2" key={language}>
                      <RadioGroup.Item id={`language-${language}`} value={language} />
                      <Label className="font-normal" htmlFor={`language-${language}`}>
                        {t(`setup.language.${language}`)}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup.Root>
            );
          }}
        />

        <Label aria-required>{t("setup.location.label")}</Label>

        <Controller
          control={control}
          name="locationId"
          render={({ field }) => {
            const isKnownLocation = locations?.some((location) => {
              return location.id === field.value;
            });

            return (
              <Select.Root
                onValueChange={field.onChange}
                value={isKnownLocation ? field.value : ""}
              >
                <Select.Trigger className="w-full">
                  <Select.Value
                    placeholder={
                      isLoadingLocations
                        ? t("setup.location.loading")
                        : t("setup.location.placeholder")
                    }
                  />
                </Select.Trigger>

                <Select.Content>
                  {locations?.map((location) => {
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

        {errors.locationId ? (
          <p className="text-sm text-destructive">{t("setup.location.required")}</p>
        ) : null}

        <Label aria-required>{t("setup.mode.label")}</Label>

        <Controller
          control={control}
          name="mode"
          render={({ field }) => {
            return (
              <RadioGroup.Root onValueChange={field.onChange} value={field.value}>
                <div className="flex items-center space-x-2">
                  <RadioGroup.Item id={CHALLENGE_MODES.ARDUINO} value={CHALLENGE_MODES.ARDUINO} />
                  <Label className="font-normal" htmlFor={CHALLENGE_MODES.ARDUINO}>
                    {t("setup.mode.arduino")}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroup.Item id={CHALLENGE_MODES.MANUAL} value={CHALLENGE_MODES.MANUAL} />
                  <Label className="font-normal" htmlFor="manual">
                    {t("setup.mode.manual")}
                  </Label>
                </div>
              </RadioGroup.Root>
            );
          }}
        />

        {errors.mode ? (
          <p className="text-sm text-destructive">{t("setup.mode.required")}</p>
        ) : null}

        {selectedMode === "arduino" ? (
          <p className="text-sm text-muted-foreground">{t("setup.mode.arduinoDescription")}</p>
        ) : null}
        {selectedMode === "manual" ? (
          <p className="text-sm text-muted-foreground">{t("setup.mode.manualDescription")}</p>
        ) : null}
      </div>

      <Button className="self-end" isLoading={isSubmitting} type="submit">
        {t("setup.continue")}
      </Button>
    </form>
  );
};

export const Route = createFileRoute("/(public)/(forms)/setup/")({
  component: RouteComponent,
});
