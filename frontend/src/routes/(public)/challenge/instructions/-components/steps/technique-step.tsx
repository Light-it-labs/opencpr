import { useTranslation } from "react-i18next";

import { Technique1, Technique2, Technique3, Technique4 } from "@/assets/images";
import { InstructionStep } from "../instruction-step";

export const TechniqueStep = () => {
  const { t } = useTranslation();

  return (
    <InstructionStep.Root>
      <InstructionStep.Content>
        <InstructionStep.Image src={Technique1} />

        <InstructionStep.Card>
          <InstructionStep.Icon>01</InstructionStep.Icon>

          <InstructionStep.Title>
            {t("challenge.instructions.technique.step1.title")}
          </InstructionStep.Title>
          <InstructionStep.Footer>
            {t("challenge.instructions.technique.step1.description")}
          </InstructionStep.Footer>
        </InstructionStep.Card>
      </InstructionStep.Content>

      <InstructionStep.Content>
        <InstructionStep.Image src={Technique2} />

        <InstructionStep.Card>
          <InstructionStep.Icon>02</InstructionStep.Icon>
          <InstructionStep.Title>
            {t("challenge.instructions.technique.step2.title")}
          </InstructionStep.Title>
          <InstructionStep.Footer>
            {t("challenge.instructions.technique.step2.description")}
          </InstructionStep.Footer>
        </InstructionStep.Card>
      </InstructionStep.Content>

      <InstructionStep.Content>
        <InstructionStep.Image src={Technique3} />

        <InstructionStep.Card>
          <InstructionStep.Icon>03</InstructionStep.Icon>

          <InstructionStep.Title>
            {t("challenge.instructions.technique.step3.title")}
          </InstructionStep.Title>
          <InstructionStep.Footer>
            {t("challenge.instructions.technique.step3.description")}
          </InstructionStep.Footer>
        </InstructionStep.Card>
      </InstructionStep.Content>

      <InstructionStep.Content>
        <InstructionStep.Image src={Technique4} />

        <InstructionStep.Card>
          <InstructionStep.Icon>04</InstructionStep.Icon>

          <InstructionStep.Title>
            {t("challenge.instructions.technique.step4.title")}
          </InstructionStep.Title>
          <InstructionStep.Footer>
            {t("challenge.instructions.technique.step4.description")}
          </InstructionStep.Footer>
        </InstructionStep.Card>
      </InstructionStep.Content>
    </InstructionStep.Root>
  );
};
