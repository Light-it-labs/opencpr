import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HttpStatusCode, isAxiosError } from "axios";
import { toast } from "sonner";
import { z } from "zod";

import { Button, Input, Label, RadioGroup } from "@/components/ui";
import { DEFAULT_LANGUAGE, LANGUAGES } from "@/i18n";
import { normalizePairingCode, PAIRING_CODE_LENGTH, usePairKiosk } from "@/services/kiosks";
import {
  CHALLENGE_MODES,
  ensureKioskId,
  setLanguage,
  setMode,
  setSerialPort,
  useKioskToken,
  useLanguage,
  usePairedLocation,
} from "@/stores";
import { getAuthorizedPort, isSerialSupported, requestSerialPort } from "@/utils";

const PAIRING_ERROR_KEYS = {
  required: "setup.pairing.errors.required",
  format: "setup.pairing.errors.format",
  rejected: "setup.pairing.errors.rejected",
  rateLimited: "setup.pairing.errors.rateLimited",
  unreachable: "common.requestError",
} as const;

type PairingError = keyof typeof PAIRING_ERROR_KEYS;

const isPairingError = (message: string | undefined): message is PairingError => {
  return message !== undefined && Object.hasOwn(PAIRING_ERROR_KEYS, message);
};

const toPairingError = (error: unknown): PairingError => {
  const status = isAxiosError(error) ? error.response?.status : undefined;

  if (status === HttpStatusCode.BadRequest) {
    return "rejected";
  }

  if (status === HttpStatusCode.TooManyRequests) {
    return "rateLimited";
  }

  return "unreachable";
};

export const setupFormSchema = z
  .object({
    mode: z.enum([CHALLENGE_MODES.ARDUINO, CHALLENGE_MODES.MANUAL]),
    language: z.enum([LANGUAGES.EN, LANGUAGES.ES]),
    isPairing: z.boolean(),
    code: z.string().transform(normalizePairingCode),
  })
  .superRefine((values, context) => {
    if (!values.isPairing) {
      return;
    }

    if (!values.code) {
      context.addIssue({ code: "custom", path: ["code"], message: "required" });
    } else if (values.code.length !== PAIRING_CODE_LENGTH) {
      context.addIssue({ code: "custom", path: ["code"], message: "format" });
    }
  });

export type SetupFormValues = z.input<typeof setupFormSchema>;
export type SetupFormData = z.output<typeof setupFormSchema>;

const RouteComponent = () => {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();

  const savedLanguage = useLanguage();
  const kioskToken = useKioskToken();
  const pairedLocation = usePairedLocation();
  const isPaired = Boolean(kioskToken && pairedLocation);

  const { mutateAsync: pairKiosk } = usePairKiosk();

  const {
    clearErrors,
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
    setValue,
    watch,
  } = useForm<SetupFormValues, unknown, SetupFormData>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: {
      mode: CHALLENGE_MODES.ARDUINO,
      language: savedLanguage ?? DEFAULT_LANGUAGE,
      isPairing: !isPaired,
      code: "",
    },
  });

  const selectedMode = watch("mode");
  const isPairing = watch("isPairing");
  const codeError = errors.code?.message;

  useEffect(() => {
    if (!isPaired) {
      setValue("isPairing", true);
    }
  }, [isPaired, setValue]);

  const keepCurrentPairing = () => {
    setValue("isPairing", false);
    setValue("code", "");
    clearErrors("code");
  };

  const onSubmit = async (data: SetupFormData) => {
    setMode(data.mode);
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

    if (data.isPairing) {
      try {
        await pairKiosk({ code: data.code, kioskId: ensureKioskId() });
      } catch (error) {
        setError("code", { type: "server", message: toPairingError(error) });

        return;
      }

      keepCurrentPairing();
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

        {isPaired && pairedLocation && !isPairing ? (
          <>
            <Label>{t("setup.pairing.label")}</Label>

            <div className="flex items-center justify-between gap-4">
              <p className="text-sm">
                {t("setup.pairing.pairedTo", {
                  name: pairedLocation.name,
                  city: pairedLocation.city,
                })}
              </p>

              <Button
                onClick={() => {
                  setValue("isPairing", true);
                }}
                type="button"
                variant="outline"
              >
                {t("setup.pairing.pairAgain")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Label htmlFor="pairing-code" aria-required>
              {t("setup.pairing.label")}
            </Label>

            {isPaired ? null : (
              <p className="text-sm text-muted-foreground">{t("setup.pairing.notPaired")}</p>
            )}

            <Input
              {...register("code")}
              aria-invalid={Boolean(codeError)}
              autoCapitalize="characters"
              autoComplete="off"
              className="font-mono tracking-widest uppercase"
              id="pairing-code"
              placeholder={t("setup.pairing.placeholder")}
              spellCheck={false}
            />

            <p className="text-sm text-muted-foreground">{t("setup.pairing.help")}</p>

            {isPairingError(codeError) ? (
              <p className="text-sm text-destructive">{t(PAIRING_ERROR_KEYS[codeError])}</p>
            ) : null}

            {isPaired ? (
              <Button
                className="self-start"
                onClick={keepCurrentPairing}
                type="button"
                variant="outline"
              >
                {t("setup.pairing.keepPairing")}
              </Button>
            ) : null}
          </>
        )}

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
