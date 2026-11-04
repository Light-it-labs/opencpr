import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Timer } from "@/components/timer";

const DURATION_IN_SECONDS = 5;

type TimerOverlayProps = {
  onTimeUp: () => void;
};

export const TimerOverlay = ({ onTimeUp }: TimerOverlayProps) => {
  const [showOverlayTimer, setShowOverlayTimer] = useState(true);

  const { t } = useTranslation();

  return showOverlayTimer ? (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-10 bg-foreground/95">
      <Timer
        onTimeUp={() => {
          setShowOverlayTimer(false);
          onTimeUp();
        }}
        timeInMilliseconds={DURATION_IN_SECONDS * 1000}
      >
        {t("challenge.instructions.startsIn")}
      </Timer>

      <p className="mt-5 text-center text-5xl font-bold text-background">
        {t("challenge.instructions.handsOff")}
      </p>
    </div>
  ) : null;
};
