import { Trans, useTranslation } from "react-i18next";

import { InstructionStep } from "../instruction-step";

export const GoalsStep = () => {
  const { t } = useTranslation();

  return (
    <InstructionStep.Root>
      <div className="flex flex-col items-center gap-6">
        <p className="text-3xl font-semibold text-primary">
          {t("challenge.instructions.goals.title")}
        </p>

        <div className="flex flex-col gap-4 *:flex *:items-center *:gap-4 *:rounded-3xl *:bg-muted *:p-4 *:text-xl">
          <div>
            <InstructionStep.Icon>💪</InstructionStep.Icon>
            {t("challenge.instructions.goals.compressions")}
          </div>
          <div>
            <InstructionStep.Icon>🎵</InstructionStep.Icon>
            <Trans>{t("challenge.instructions.goals.rhythm")}</Trans>
          </div>
          <div>
            <InstructionStep.Icon>📏</InstructionStep.Icon>
            {t("challenge.instructions.goals.depth")}
          </div>
          <div>
            <InstructionStep.Icon>⬆️</InstructionStep.Icon>
            {t("challenge.instructions.goals.recoil")}
          </div>
        </div>
      </div>
    </InstructionStep.Root>
  );
};
