"use client";

import { useCallback, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { createFileRoute, getRouteApi, useNavigate } from "@tanstack/react-router";
import { twMerge } from "tailwind-merge";
import z from "zod";

import { Logo } from "@/components/logo";
import { StepIndicator } from "@/components/step-indicator";
import { AutoFocusButton, Button, Icons, toast } from "@/components/ui";
import { CHALLENGE_MODES, setCprSession, setSerialPort, useMode, useSerialPort } from "@/stores";
import { getAuthorizedPort, isSerialSupported, requestSerialPort } from "@/utils";
import { GoalsStep, PositioningStep, TechniqueStep } from "./-components";

const STEP_KEYS = {
  POSITIONING: "positioning",
  TECHNIQUE: "technique",
  GOALS: "goals",
};

const STEPS = [
  { node: <PositioningStep key={STEP_KEYS.POSITIONING} />, key: STEP_KEYS.POSITIONING },
  { node: <TechniqueStep key={STEP_KEYS.TECHNIQUE} />, key: STEP_KEYS.TECHNIQUE },
  { node: <GoalsStep key={STEP_KEYS.GOALS} />, key: STEP_KEYS.GOALS },
];

const TOTAL_STEPS = STEPS.length;

const { useSearch } = getRouteApi("/(public)/challenge/instructions/");

const RouteComponent = () => {
  const search = useSearch();
  const [currentStepIndex, setCurrentStepIndex] = useState(search.step ?? 0);

  const navigate = useNavigate();
  const { t } = useTranslation();
  const serialPort = useSerialPort();
  const mode = useMode();

  const currentStep = STEPS[currentStepIndex];
  const isFinalStep = currentStepIndex === TOTAL_STEPS - 1;

  const handleNext = useCallback(async () => {
    if (currentStepIndex < TOTAL_STEPS - 1) {
      setCurrentStepIndex((prev) => {
        return prev + 1;
      });

      return;
    }

    // Serial port authorization happens on the last step's "next" press, same
    // as the video flow did: the kiosk cannot read the sensor without it.
    if (!serialPort && mode === CHALLENGE_MODES.ARDUINO) {
      if (!isSerialSupported()) {
        toast.error(t("setup.messages.unsupportedBrowser"));

        return;
      }

      const port = (await getAuthorizedPort()) ?? (await requestSerialPort());

      if (!port) {
        toast.error(t("setup.messages.portRequestError"));

        return;
      }

      setSerialPort(port);
    } else {
      navigate({ to: "/challenge/start" });
      setCprSession(null);
    }
  }, [currentStepIndex, serialPort, mode, navigate, t]);

  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => {
        return prev - 1;
      });
    } else {
      // Back to the start rather than the QR: returning to the QR screen
      // would mint a second registration and strand the one they had
      // already scanned, filing their run under nobody.
      navigate({ to: "/" });
    }
  }, [currentStepIndex, navigate]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        handleNext();
      } else if (event.key === "ArrowLeft") {
        handlePrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleNext, handlePrevious]);

  return (
    <div className="relative flex size-full flex-col gap-8 px-20 py-8">
      <Logo className="self-center" />

      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="font-heading text-5xl font-bold">
          {isFinalStep ? (
            t("challenge.instructions.challengeStarts")
          ) : (
            <Trans components={{ bold: <span className="text-primary" /> }}>
              {t("challenge.instructions.pageTitle")}
            </Trans>
          )}
        </h1>

        {isFinalStep ? null : (
          <>
            <p className="text-xl font-light opacity-90">
              <Trans components={{ bold: <span className="font-bold" /> }}>
                {t("challenge.instructions.pageSubtitle")}
              </Trans>
            </p>

            <StepIndicator currentStepIndex={currentStepIndex} totalSteps={TOTAL_STEPS - 1} />
          </>
        )}
      </div>

      {isFinalStep ? null : (
        <p className="pt-10 text-center text-3xl opacity-90">
          <Trans components={{ bold: <span className="font-bold" /> }}>
            {t(`challenge.instructions.${currentStep.key}.title`)}
          </Trans>
        </p>
      )}

      <div
        className={twMerge(
          "flex flex-1 flex-col items-center gap-10",
          isFinalStep ? "justify-start pt-12" : "justify-center",
        )}
      >
        {STEPS.map((step, index) => {
          return currentStepIndex === index ? <div key={index}>{step.node}</div> : null;
        })}

        {isFinalStep ? (
          <AutoFocusButton onClick={handleNext} size="xl">
            {t("challenge.instructions.letsBegin")}
          </AutoFocusButton>
        ) : null}
      </div>

      {isFinalStep ? null : (
        <div className="flex items-center justify-center gap-4">
          <Button disabled={!currentStepIndex} onClick={handlePrevious} size="lg">
            <Icons.ArrowLeft className="size-5" />
          </Button>

          <AutoFocusButton className="focus-visible:ring-ring/50" onClick={handleNext} size="lg">
            <Icons.ArrowRight className="size-5" />
          </AutoFocusButton>
        </div>
      )}
    </div>
  );
};

export const Route = createFileRoute("/(public)/challenge/instructions/")({
  component: RouteComponent,
  validateSearch: z.object({ step: z.number().optional() }).parse,
});
