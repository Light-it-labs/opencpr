import { useTranslation } from "react-i18next";

import { Positioning1, Positioning2, Positioning3 } from "@/assets/images";
import { InstructionStep } from "../instruction-step";

export const PositioningStep = () => {
  const { t } = useTranslation();

  return (
    <InstructionStep.Root>
      <InstructionStep.Content>
        <InstructionStep.Image src={Positioning1} />

        <InstructionStep.Card>
          <InstructionStep.Icon>❤️</InstructionStep.Icon>

          <InstructionStep.Title>
            {t("challenge.instructions.positioning.step1.title")}
          </InstructionStep.Title>

          <InstructionStep.Footer>
            {t("challenge.instructions.positioning.step1.description")}
          </InstructionStep.Footer>
        </InstructionStep.Card>
      </InstructionStep.Content>

      <InstructionStep.Content>
        <InstructionStep.Image src={Positioning2} />

        <InstructionStep.Card>
          <InstructionStep.Icon>🔒</InstructionStep.Icon>
          <InstructionStep.Title>
            {t("challenge.instructions.positioning.step2.title")}
          </InstructionStep.Title>

          <InstructionStep.Footer>
            {t("challenge.instructions.positioning.step2.description")}
          </InstructionStep.Footer>
        </InstructionStep.Card>
      </InstructionStep.Content>

      <InstructionStep.Content>
        <InstructionStep.Image src={Positioning3} />

        <InstructionStep.Card>
          <InstructionStep.Icon>🫀</InstructionStep.Icon>

          <InstructionStep.Title>
            {t("challenge.instructions.positioning.step3.title")}
          </InstructionStep.Title>

          <InstructionStep.Footer>
            {t("challenge.instructions.positioning.step3.description")}
          </InstructionStep.Footer>
        </InstructionStep.Card>
      </InstructionStep.Content>
    </InstructionStep.Root>
  );
};
